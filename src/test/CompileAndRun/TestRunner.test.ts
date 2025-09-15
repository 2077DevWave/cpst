import * as path from 'path';
import { IExecutor, IFileManager, ITestRunner } from '../../core/Interfaces/classes';
import { IExecutionResult } from '../../core/Interfaces/datastructures';
import { TestRunner } from '../../core/CompileAndRun/TestRunner'; // Adjust the import path accordingly

// Mock the dependencies
jest.mock('path');

// Create mock implementations for the interfaces
const mockExecutor: jest.Mocked<IExecutor> = {
  runWithLimits: jest.fn(),
};

const mockFileManager: jest.Mocked<IFileManager> = {
  // We only need to mock the methods used by TestRunner
  writeFile: jest.fn(),
  createDirectory: jest.fn(), // Not used, but good for completeness
  readFile: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn(),
  listDirectory: jest.fn(),
  getSolutionFileUri: jest.fn(),
  getGenValFileUri: jest.fn(),
  getCheckerFileUri: jest.fn(),
  copyFile: jest.fn(),
};

describe('TestRunner', () => {
  let testRunner: ITestRunner;
  const mockedPath = path as jest.Mocked<typeof path>;

  const tempDir = '/tmp/test';
  const solutionExec = './solution.out';
  const generatorExec = './gen.out';
  const checkerExec = './check.out';

  beforeEach(() => {
    // Setup and reset before each test
    jest.clearAllMocks();
    testRunner = new TestRunner(mockExecutor, mockFileManager);
    
    // Mock path.join for deterministic file paths
    mockedPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('run', () => {
    it('should return OK when generator, solution, and checker run successfully', async () => {
      // Arrange
      const generatorResult: IExecutionResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
      const solutionResult: IExecutionResult = { stdout: 'correct output', stderr: '', duration: 100, memory: 1024, status: 'OK' };
      const checkerResult: IExecutionResult = { stdout: '', stderr: '', duration: 20, memory: 0, status: 'OK' };

      mockExecutor.runWithLimits
        .mockResolvedValueOnce(generatorResult)
        .mockResolvedValueOnce(solutionResult)
        .mockResolvedValueOnce(checkerResult);

      const expectedInputFile = `${tempDir}/input.txt`;
      const expectedOutputFile = `${tempDir}/output.txt`;

      // Act
      const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

      // Assert
      expect(result.status).toBe('OK');
      expect(result.input).toBe(generatorResult.stdout);
      expect(result.output).toBe(solutionResult.stdout);
      expect(result.duration).toBe(solutionResult.duration);
      expect(result.memory).toBe(solutionResult.memory);

      expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(3);
      expect(mockExecutor.runWithLimits).toHaveBeenNthCalledWith(1, generatorExec, '');
      expect(mockExecutor.runWithLimits).toHaveBeenNthCalledWith(2, solutionExec, generatorResult.stdout);
      expect(mockExecutor.runWithLimits).toHaveBeenNthCalledWith(3, `${checkerExec} ${expectedInputFile} ${expectedOutputFile}`, '');
      
      expect(mockFileManager.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(expectedInputFile, generatorResult.stdout);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(expectedOutputFile, solutionResult.stdout);
    });

    it('should return an Error status if the generator produces an error', async () => {
        // Arrange
        const generatorResult: IExecutionResult = { stdout: '', stderr: 'Generation failed', duration: 10, memory: 0, status: 'RUNTIME_ERROR' };
        mockExecutor.runWithLimits.mockResolvedValue(generatorResult);

        // Act
        const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

        // Assert
        expect(result.status).toBe('Error');
        expect(result.message).toBe('Generator error: Generation failed');
        expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(1);
        expect(mockFileManager.writeFile).not.toHaveBeenCalled();
    });

    it('should return the solution status if the solution fails (e.g., TLE)', async () => {
        // Arrange
        const generatorResult: IExecutionResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
        const solutionResult: IExecutionResult = { stdout: '', stderr: '', duration: 2000, memory: 1024, status: 'TLE' };
        mockExecutor.runWithLimits
            .mockResolvedValueOnce(generatorResult)
            .mockResolvedValueOnce(solutionResult);

        // Act
        const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

        // Assert
        expect(result.status).toBe('TLE');
        expect(result.input).toBe(generatorResult.stdout);
        expect(result.duration).toBe(solutionResult.duration);
        expect(result.memory).toBe(solutionResult.memory);
        expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(2);
        expect(mockFileManager.writeFile).not.toHaveBeenCalled();
    });

    it('should return RUNTIME_ERROR if the solution produces stderr output', async () => {
        // Arrange
        const generatorResult: IExecutionResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
        const solutionResult: IExecutionResult = { stdout: 'some output', stderr: 'segmentation fault', duration: 150, memory: 1024, status: 'OK' };
        mockExecutor.runWithLimits
            .mockResolvedValueOnce(generatorResult)
            .mockResolvedValueOnce(solutionResult);
        
        // Act
        const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

        // Assert
        expect(result.status).toBe('RUNTIME_ERROR');
        expect(result.message).toBe(`Solution runtime error: ${solutionResult.stderr}`);
        expect(result.input).toBe(generatorResult.stdout);
        expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(2);
        expect(mockFileManager.writeFile).not.toHaveBeenCalled();
    });

    it('should return WA when the checker fails with exit code 1', async () => {
        // Arrange
        const generatorResult: IExecutionResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
        const solutionResult: IExecutionResult = { stdout: 'wrong output', stderr: '', duration: 100, memory: 1024, status: 'OK' };
        const checkerError = { code: 1, stderr: 'Mismatch found' }; // Create an error object that matches the catch block's expectation

        mockExecutor.runWithLimits
            .mockResolvedValueOnce(generatorResult)
            .mockResolvedValueOnce(solutionResult)
            .mockRejectedValueOnce(checkerError);

        // Act
        const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

        // Assert
        expect(result.status).toBe('WA');
        expect(result.input).toBe(generatorResult.stdout);
        expect(result.output).toBe(solutionResult.stdout);
        expect(result.duration).toBe(solutionResult.duration);
        expect(result.memory).toBe(solutionResult.memory);
        expect(mockFileManager.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should return an Error status if the checker fails with an exit code other than 1', async () => {
        // Arrange
        const generatorResult: IExecutionResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
        const solutionResult: IExecutionResult = { stdout: 'some output', stderr: '', duration: 100, memory: 1024, status: 'OK' };
        const checkerError = { code: 2, stderr: 'Checker crashed unexpectedly' };

        mockExecutor.runWithLimits
            .mockResolvedValueOnce(generatorResult)
            .mockResolvedValueOnce(solutionResult)
            .mockRejectedValueOnce(checkerError);

        // Act
        const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

        // Assert
        expect(result.status).toBe('Error');
        expect(result.message).toBe(`Checker error: ${checkerError.stderr}`);
        expect(mockFileManager.writeFile).toHaveBeenCalledTimes(2);
    });
  });
});