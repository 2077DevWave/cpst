import { exec } from 'child_process';
import { CommandExecutor } from '../../core/CompileAndRun/CommandExecutor';

jest.mock('child_process');

const mockedExec = exec as unknown as jest.Mock;

describe('CommandExecutor', () => {
  let commandExecutor: CommandExecutor;

  beforeEach(() => {
    commandExecutor = new CommandExecutor();
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should resolve with an object containing stdout and stderr on successful execution', async () => {
      // Arrange
      const command = 'g++ solution.cpp -o solution.out';
      const expectedOutput = { stdout: 'Success', stderr: '' };

      mockedExec.mockImplementation((_cmd, callback) => {
        callback(null, expectedOutput);
        return {} as any;
      });

      // Act
      const result = await commandExecutor.execute(command);

      // Assert
      expect(mockedExec).toHaveBeenCalledWith(command, expect.any(Function));
      expect(result).toEqual(expectedOutput);
    });

    it('should reject with an error when the command execution fails', async () => {
      // Arrange
      const command = 'g++ broken.cpp -o broken.out';
      const expectedError = new Error('Compilation failed');

      mockedExec.mockImplementation((_cmd, callback) => {
        callback(expectedError, undefined);
        return {} as any;
      });

      // Act & Assert
      await expect(commandExecutor.execute(command)).rejects.toThrow('Compilation failed');
      expect(mockedExec).toHaveBeenCalledWith(command, expect.any(Function));
    });

    it('should resolve with an object containing stderr content when a command writes to stderr', async () => {
        // Arrange
        const command = 'python script_with_warnings.py';
        const expectedOutput = { stdout: 'Some output', stderr: 'Warning: Deprecated feature used' };

        mockedExec.mockImplementation((_cmd, callback) => {
            callback(null, expectedOutput);
            return {} as any;
        });

        // Act
        const result = await commandExecutor.execute(command);

        // Assert
        expect(mockedExec).toHaveBeenCalledWith(command, expect.any(Function));
        expect(result).toEqual(expectedOutput);
      });
  });
});