import { exec, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Executor } from '../../core/CompileAndRun/Executor'; // Adjust the import path accordingly

// Mock the dependencies
jest.mock('child_process');

// Define a mock ChildProcess class that extends EventEmitter
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: jest.fn(),
    end: jest.fn(),
  };
}

describe('Executor', () => {
  let executor: Executor;
  let mockChildProcess: MockChildProcess;
  const mockedExec = exec as unknown as jest.Mock;
  const mockHrtime = jest.spyOn(process, 'hrtime');

  beforeEach(() => {
    // Setup and reset before each test
    jest.clearAllMocks();
    executor = new Executor();

    // Create a new mock ChildProcess for each test
    mockChildProcess = new MockChildProcess();
    mockedExec.mockReturnValue(mockChildProcess as unknown as ChildProcess);

    // Mock process.hrtime for consistent duration calculation
    // First call is the start time, second is the diff
    const startTime: [number, number] = [1000, 100000000];
    const diffTime: [number, number] = [0, 500000000]; // 500ms
    mockHrtime
      .mockReturnValueOnce(startTime)
      .mockImplementation((start?: [number, number]) => {
          if (start && start[0] === startTime[0] && start[1] === startTime[1]) {
              return diffTime;
          }
          return [0,0];
      });
  });

  describe('runWithLimits', () => {
    it('should return an OK status for a successful execution with zero exit code', async () => {
      // Arrange
      const command = 'echo "hello"';
      const input = '';

      // Act
      const promise = executor.runWithLimits(command, input);

      // Simulate the process execution
      mockChildProcess.stdout.emit('data', 'hello');
      mockChildProcess.emit('close', 0, null); // code=0, signal=null

      const result = await promise;

      // Assert
      expect(result.status).toBe('OK');
      expect(result.stdout).toBe('hello');
      expect(result.stderr).toBe('');
      expect(result.duration).toBe(500); // 500ms from mockHrtime
    });

    it('should return a TLE status when the process is killed by SIGTERM', async () => {
      // Arrange
      const command = './a.out';
      const input = 'some_input';

      // Act
      const promise = executor.runWithLimits(command, input);

      // Simulate a timeout kill
      mockChildProcess.emit('close', null, 'SIGTERM');

      const result = await promise;

      // Assert
      expect(result.status).toBe('TLE');
      expect(result.duration).toBe(500);
    });

    it('should return a RUNTIME_ERROR status for a non-zero exit code', async () => {
      // Arrange
      const command = './a.out';
      const input = '';

      // Act
      const promise = executor.runWithLimits(command, input);

      // Simulate a runtime error
      mockChildProcess.stderr.emit('data', 'segmentation fault');
      mockChildProcess.emit('close', 139, null); // code=139

      const result = await promise;

      // Assert
      expect(result.status).toBe('RUNTIME_ERROR');
      expect(result.stderr).toBe('segmentation fault');
      expect(result.duration).toBe(500);
    });

    it('should return an MLE status when the maxBuffer is exceeded', async () => {
        // Arrange
        const command = './a.out';
        const input = '';
        const maxBufferError = new Error('stdout maxBuffer exceeded');
  
        // Act
        const promise = executor.runWithLimits(command, input);
  
        // Simulate the 'error' event for maxBuffer and then 'close'
        mockChildProcess.emit('error', maxBufferError);
        mockChildProcess.emit('close', 1, null); // A non-zero code usually accompanies this
  
        const result = await promise;
  
        // Assert
        expect(result.status).toBe('MLE');
        expect(result.duration).toBe(500);
      });

    it('should write the provided input to the child process stdin', async () => {
      // Arrange
      const command = './a.out';
      const input = 'my test input';

      // Act
      const promise = executor.runWithLimits(command, input);
      mockChildProcess.emit('close', 0, null);
      await promise;

      // Assert
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(input);
      expect(mockChildProcess.stdin.end).toHaveBeenCalled();
    });

    it('should use default options when none are provided', async () => {
        // Arrange
        const command = './a.out';
        const input = '';
        const expectedDefaultOptions = {
            timeout: 2000,
            maxBuffer: 1024 * 1024 * 512,
            killSignal: 'SIGTERM'
        };

        // Act
        const promise = executor.runWithLimits(command, input);
        mockChildProcess.emit('close', 0, null);
        await promise;
  
        // Assert
        expect(mockedExec).toHaveBeenCalledWith(command, expectedDefaultOptions);
    });

    it('should override default options with provided custom options', async () => {
        // Arrange
        const command = './a.out';
        const input = '';
        const customOptions = { timeout: 5000 };
        const expectedMergedOptions = {
            timeout: 5000,
            maxBuffer: 1024 * 1024 * 512,
            killSignal: 'SIGTERM'
        };

        // Act
        const promise = executor.runWithLimits(command, input, customOptions);
        mockChildProcess.emit('close', 0, null);
        await promise;
  
        // Assert
        expect(mockedExec).toHaveBeenCalledWith(command, expectedMergedOptions);
    });

    it('should correctly assemble chunked stdout and stderr data', async () => {
        // Arrange
        const command = './a.out';
        const input = '';
  
        // Act
        const promise = executor.runWithLimits(command, input);
  
        // Simulate chunked data
        mockChildProcess.stdout.emit('data', 'hello ');
        mockChildProcess.stderr.emit('data', 'error ');
        mockChildProcess.stdout.emit('data', 'world');
        mockChildProcess.stderr.emit('data', 'message');
        mockChildProcess.emit('close', 1, null);
  
        const result = await promise;
  
        // Assert
        expect(result.stdout).toBe('hello world');
        expect(result.stderr).toBe('error message');
        expect(result.status).toBe('RUNTIME_ERROR');
      });
  });
});