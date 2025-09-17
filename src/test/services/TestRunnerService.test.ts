import { ITestRunnerService } from '../../core/Interfaces/services';
import { ITestRunResult } from '../../core/Interfaces/datastructures';
import { ICPSTFolderManager, ITestRunner } from '../../core/Interfaces/classes';
import { TestRunnerService } from '../../core/Services/TestRunnerService';

// Mock the dependencies (interfaces) by creating mock objects
const mockCpstFolderManager: jest.Mocked<ICPSTFolderManager> = {
  getTempDirPath: jest.fn(),
  getSolutionName: jest.fn(),
  getRunId: jest.fn(),
  getResultDirPath: jest.fn(),
  getMainJsonPath: jest.fn(),
  getRunResultDirPath: jest.fn(),
  getTestCaseResultPath: jest.fn(),
  getTestPaths: jest.fn(),
  generateNonce: jest.fn(),
  createTempDir: jest.fn(),
  createResultDir: jest.fn(),
  createRunFolder: jest.fn(),
  addSolutionToMainJson: jest.fn(),
  addRunToMainJson: jest.fn(),
  addSolution: jest.fn(),
  addRun: jest.fn(),
  readMainJson: jest.fn(),
  initializeTestRun: jest.fn(),
  saveResult: jest.fn(),
  getallSolutions: jest.fn(),
  getallRuns: jest.fn(),
  getallTestResults: jest.fn(),
  deleteRun: jest.fn(),
  deleteSolution: jest.fn(),
  deleteTestResult: jest.fn(),
  cleanup: jest.fn(),
};

const mockTestRunner: jest.Mocked<ITestRunner> = {
  run: jest.fn(),
  runWithInput: jest.fn()
};

describe('TestRunnerService', () => {
  let testRunnerService: ITestRunnerService;

  beforeEach(() => {
    // Setup and reset before each test
    jest.clearAllMocks();
    testRunnerService = new TestRunnerService(mockCpstFolderManager, mockTestRunner);
  });

  describe('runSingleTest', () => {
    it('should get the temp directory, call the test runner, and return the result', async () => {
      // Arrange
      const tempDir = '/cpst/temp';
      const solutionExec = './solution.out';
      const generatorExec = './gen.out';
      const checkerExec = './check.out';

      const expectedTestResult: ITestRunResult = {
        status: 'OK',
        duration: 123,
        memory: 456,
        input: 'test input',
        output: 'test output',
      };

      mockCpstFolderManager.getTempDirPath.mockReturnValue(tempDir as any); // Using `as any` because of branded types
      mockTestRunner.run.mockResolvedValue(expectedTestResult);

      // Act
      const result = await testRunnerService.runSingleTest(solutionExec, generatorExec, checkerExec);

      // Assert
      expect(mockCpstFolderManager.getTempDirPath).toHaveBeenCalledTimes(1);
      expect(mockTestRunner.run).toHaveBeenCalledTimes(1);
      expect(mockTestRunner.run).toHaveBeenCalledWith(tempDir, solutionExec, generatorExec, checkerExec);
      expect(result).toEqual(expectedTestResult);
    });

    it('should correctly pass through a failure result from the test runner', async () => {
        // Arrange
        const tempDir = '/cpst/temp';
        const solutionExec = './solution.out';
        const generatorExec = './gen.out';
        const checkerExec = './check.out';
  
        const expectedFailureResult: ITestRunResult = {
          status: 'TLE',
          duration: 2000,
          memory: 500,
          input: 'large input',
        };
  
        mockCpstFolderManager.getTempDirPath.mockReturnValue(tempDir as any);
        mockTestRunner.run.mockResolvedValue(expectedFailureResult);
  
        // Act
        const result = await testRunnerService.runSingleTest(solutionExec, generatorExec, checkerExec);
  
        // Assert
        expect(mockCpstFolderManager.getTempDirPath).toHaveBeenCalledTimes(1);
        expect(mockTestRunner.run).toHaveBeenCalledWith(tempDir, solutionExec, generatorExec, checkerExec);
        expect(result).toEqual(expectedFailureResult);
    });

    it('should propagate errors thrown by the test runner', async () => {
        // Arrange
        const tempDir = '/cpst/temp';
        const solutionExec = './solution.out';
        const generatorExec = './gen.out';
        const checkerExec = './check.out';
        const expectedError = new Error('Test runner crashed');
  
        mockCpstFolderManager.getTempDirPath.mockReturnValue(tempDir as any);
        mockTestRunner.run.mockRejectedValue(expectedError);
  
        // Act & Assert
        await expect(testRunnerService.runSingleTest(solutionExec, generatorExec, checkerExec))
            .rejects.toThrow('Test runner crashed');
        
        expect(mockCpstFolderManager.getTempDirPath).toHaveBeenCalledTimes(1);
        expect(mockTestRunner.run).toHaveBeenCalledWith(tempDir, solutionExec, generatorExec, checkerExec);
      });
  });
});
