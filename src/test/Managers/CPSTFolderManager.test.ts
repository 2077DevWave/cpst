import * as path from 'path';
import { IFileManager } from '../../core/Interfaces/classes';
import { IJsonTestResult } from '../../core/Interfaces/datastructures';
import { CPSTFolderManager } from '../../core/Managers/CPSTFolderManager';

// Mock the dependencies
jest.mock('fs'); // fs is not a direct dependency, but path might use it internally. Better safe.
jest.mock('path');

// Since IFileManager is an interface, we create a mock implementation for it.
const mockFileManager: jest.Mocked<IFileManager> = {
  createDirectory: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn(),
  listDirectory: jest.fn(),
  getSolutionFileUri: jest.fn(),
  getGenValFileUri: jest.fn(),
  getCheckerFileUri: jest.fn(),
  copyFile: jest.fn(),
};

describe('CPSTFolderManager', () => {
  let folderManager: CPSTFolderManager;
  const baseDir = '/cpst';
  const mockedPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    // Setup and reset before each test
    jest.clearAllMocks();
    folderManager = new CPSTFolderManager(mockFileManager, baseDir);

    // Mock path functions for deterministic behavior
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.basename.mockImplementation(p => p.split('/').pop() || '');
  });

  describe('setup', () => {
    it('should create all necessary directories and return the correct paths', () => {
      // Arrange
      const solutionPath = '/solutions/problemA.cpp';
      const fixedDate = new Date('2023-10-27T10:00:00.000Z');
      const expectedRunFolderName = fixedDate.toISOString().replace(/[:.]/g, '-'); // "2023-10-27T10-00-00-000Z"
      
      jest.useFakeTimers().setSystemTime(fixedDate);

      const expectedPaths = {
        tempDir: `${baseDir}/temp`,
        resultsDir: `${baseDir}/results`,
        solutionDir: `${baseDir}/results/problemA.cpp`,
        runFolderPath: `${baseDir}/results/problemA.cpp/${expectedRunFolderName}`,
        mainJsonPath: `${baseDir}/results/main.json`,
      };
      
      // Act
      const result = folderManager.setup(solutionPath);
      
      // Assert
      expect(mockFileManager.createDirectory).toHaveBeenCalledWith(expectedPaths.tempDir);
      expect(mockFileManager.createDirectory).toHaveBeenCalledWith(expectedPaths.resultsDir);
      expect(mockFileManager.createDirectory).toHaveBeenCalledWith(expectedPaths.solutionDir);
      expect(mockFileManager.createDirectory).toHaveBeenCalledWith(expectedPaths.runFolderPath);
      expect(mockFileManager.createDirectory).toHaveBeenCalledTimes(4);

      expect(result).toEqual(expectedPaths);

      jest.useRealTimers();
    });
  });

  describe('initializeTestRun', () => {
    const solutionName = 'problemA.cpp';
    const runFolderName = 'run1';
    const mainJsonPath = `${baseDir}/results/main.json`;

    it('should create a new main.json if it does not exist', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(false);
      const expectedContent = { [solutionName]: [runFolderName] };

      // Act
      folderManager.initializeTestRun(solutionName, runFolderName, mainJsonPath);

      // Assert
      expect(mockFileManager.exists).toHaveBeenCalledWith(mainJsonPath);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        mainJsonPath,
        JSON.stringify(expectedContent, null, 4)
      );
    });

    it('should add a new solution entry if the solution is not in an existing main.json', () => {
      // Arrange
      const existingContent = { 'problemB.cpp': ['runB1'] };
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue(JSON.stringify(existingContent));
      const expectedContent = { ...existingContent, [solutionName]: [runFolderName] };

      // Act
      folderManager.initializeTestRun(solutionName, runFolderName, mainJsonPath);

      // Assert
      expect(mockFileManager.readFile).toHaveBeenCalledWith(mainJsonPath);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        mainJsonPath,
        JSON.stringify(expectedContent, null, 4)
      );
    });

    it('should append a new run folder to an existing solution entry', () => {
      // Arrange
      const existingContent = { [solutionName]: ['existingRun'] };
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue(JSON.stringify(existingContent));
      const expectedContent = { [solutionName]: ['existingRun', runFolderName] };

      // Act
      folderManager.initializeTestRun(solutionName, runFolderName, mainJsonPath);

      // Assert
      expect(mockFileManager.readFile).toHaveBeenCalledWith(mainJsonPath);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        mainJsonPath,
        JSON.stringify(expectedContent, null, 4)
      );
    });

    it('should handle a malformed main.json by creating a new entry', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue('invalid json');
      const expectedContent = { [solutionName]: [runFolderName] };

      // Act
      folderManager.initializeTestRun(solutionName, runFolderName, mainJsonPath);

      // Assert
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        mainJsonPath,
        JSON.stringify(expectedContent, null, 4)
      );
    });
  });

  describe('saveResult', () => {
    it('should write the test result to the correct file path', () => {
      // Arrange
      const runFolderPath = `${baseDir}/results/problemA.cpp/run1`;
      const result: IJsonTestResult = { testCase: 1, lastResult: 'OK' };
      const expectedFilePath = `${runFolderPath}/test_1.json`;

      // Act
      folderManager.saveResult(runFolderPath, result);

      // Assert
      expect(mockedPath.join).toHaveBeenCalledWith(runFolderPath, `test_${result.testCase}.json`);
      expect(mockFileManager.writeFile).toHaveBeenCalledWith(
        expectedFilePath,
        JSON.stringify(result, null, 4)
      );
    });
  });

  describe('getSolutions', () => {
    const mainJsonPath = `${baseDir}/results/main.json`;

    it('should return an empty array if main.json does not exist', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(false);

      // Act
      const solutions = folderManager.getSolutions();

      // Assert
      expect(mockFileManager.exists).toHaveBeenCalledWith(mainJsonPath);
      expect(solutions).toEqual([]);
    });

    it('should return an empty array if main.json is malformed', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue('invalid json');

      // Act
      const solutions = folderManager.getSolutions();

      // Assert
      expect(solutions).toEqual([]);
    });

    it('should return the list of solutions from main.json', () => {
      // Arrange
      const mainJsonContent = { 'problemA.cpp': [], 'problemB.cpp': [] };
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue(JSON.stringify(mainJsonContent));

      // Act
      const solutions = folderManager.getSolutions();

      // Assert
      expect(solutions).toEqual(['problemA.cpp', 'problemB.cpp']);
    });
  });

  describe('getRuns', () => {
    const mainJsonPath = `${baseDir}/results/main.json`;
    const solutionName = 'problemA.cpp';

    it('should return an empty array if main.json does not exist', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(false);

      // Act
      const runs = folderManager.getRuns(solutionName);

      // Assert
      expect(runs).toEqual([]);
    });

    it('should return an empty array if main.json is malformed', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue('invalid json');

      // Act
      const runs = folderManager.getRuns(solutionName);

      // Assert
      expect(runs).toEqual([]);
    });

    it('should return an empty array if the solution does not exist in main.json', () => {
        // Arrange
        const mainJsonContent = { 'problemB.cpp': ['runB1'] };
        mockFileManager.exists.mockReturnValue(true);
        mockFileManager.readFile.mockReturnValue(JSON.stringify(mainJsonContent));
  
        // Act
        const runs = folderManager.getRuns(solutionName);
  
        // Assert
        expect(runs).toEqual([]);
    });

    it('should return the array of runs for a given solution', () => {
      // Arrange
      const mainJsonContent = { [solutionName]: ['runA1', 'runA2'], 'problemB.cpp': ['runB1'] };
      mockFileManager.exists.mockReturnValue(true);
      mockFileManager.readFile.mockReturnValue(JSON.stringify(mainJsonContent));

      // Act
      const runs = folderManager.getRuns(solutionName);

      // Assert
      expect(runs).toEqual(['runA1', 'runA2']);
    });
  });

  describe('getTestResults', () => {
    const solutionName = 'problemA.cpp';
    const runId = 'run1';
    const runFolderPath = `${baseDir}/results/${solutionName}/${runId}`;

    it('should return an empty array if the run folder path does not exist', () => {
      // Arrange
      mockFileManager.exists.mockReturnValue(false);

      // Act
      const results = folderManager.getTestResults(solutionName, runId);

      // Assert
      expect(mockFileManager.exists).toHaveBeenCalledWith(runFolderPath);
      expect(results).toEqual([]);
    });

    it('should read, parse, and return all test result files in a run folder', () => {
        // Arrange
        const testResult1: IJsonTestResult = { testCase: 1, lastResult: 'Passed' };
        const testResult2: IJsonTestResult = { testCase: 2, lastResult: 'WA' };

        mockFileManager.exists.mockReturnValue(true);
        mockFileManager.listDirectory.mockReturnValue(['test_1.json', 'test_2.json', 'other_file.txt']);
        mockFileManager.readFile
            .mockReturnValueOnce(JSON.stringify(testResult1))
            .mockReturnValueOnce(JSON.stringify(testResult2));
        
        // Act
        const results = folderManager.getTestResults(solutionName, runId);

        // Assert
        expect(mockFileManager.listDirectory).toHaveBeenCalledWith(runFolderPath);
        expect(mockFileManager.readFile).toHaveBeenCalledTimes(2);
        expect(mockFileManager.readFile).toHaveBeenCalledWith(`${runFolderPath}/test_1.json`);
        expect(mockFileManager.readFile).toHaveBeenCalledWith(`${runFolderPath}/test_2.json`);
        expect(results).toEqual([testResult1, testResult2]);
    });

    it('should skip files that fail to parse and continue', () => {
        // Arrange
        const testResult1: IJsonTestResult = { testCase: 1, lastResult: 'Passed' };
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockFileManager.exists.mockReturnValue(true);
        mockFileManager.listDirectory.mockReturnValue(['test_1.json', 'test_2_bad.json']);
        mockFileManager.readFile
            .mockReturnValueOnce(JSON.stringify(testResult1))
            .mockReturnValueOnce('invalid json');
        
        // Act
        const results = folderManager.getTestResults(solutionName, runId);

        // Assert
        expect(results).toEqual([testResult1]);
        expect(results.length).toBe(1);
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
  });

  describe('getTempDir', () => {
    it('should return the correct temporary directory path', () => {
      // Arrange
      const expectedPath = `${baseDir}/temp`;

      // Act
      const tempDir = folderManager.getTempDir();

      // Assert
      expect(mockedPath.join).toHaveBeenCalledWith(baseDir, 'temp');
      expect(tempDir).toBe(expectedPath);
    });
  });

  describe('cleanup', () => {
    it('should call the file manager cleanup method with the provided paths', () => {
      // Arrange
      const pathsToClean = ['/dir1', '/dir2'];

      // Act
      folderManager.cleanup(pathsToClean);

      // Assert
      expect(mockFileManager.cleanup).toHaveBeenCalledWith(pathsToClean);
    });
  });
});