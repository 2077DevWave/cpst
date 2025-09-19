import * as path from 'path';
import { IFileManager } from '../../core/Interfaces/classes';
import { IJsonTestResult, ISolutionName, IRunId, IMainJson, ISolutionPath, IRunDirPath, IMainJsonPath } from '../../core/Interfaces/datastructures';
import { CPSTFolderManager } from '../../core/Managers/CPSTFolderManager';

// Mock the dependencies
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
    deleteFile: jest.fn(),
    deleteDirectory: jest.fn(),
};

describe('CPSTFolderManager', () => {
    let folderManager: CPSTFolderManager;
    const baseDir = '/cpst';
    const mockedPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        // Setup and reset before each test
        jest.clearAllMocks();

        // Mock path functions for deterministic behavior
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedPath.basename.mockImplementation(p => p.split('/').pop() || '');

        // We instantiate after mocking path because the constructor uses it.
        folderManager = new CPSTFolderManager(mockFileManager, baseDir);
    });

    describe('Path Getters', () => {
        it('getSolutionName should return the base name of the solution path', () => {
            const solutionPath = '/path/to/solution.cpp' as ISolutionPath;
            expect(folderManager.getSolutionName(solutionPath)).toBe('solution.cpp');
            expect(mockedPath.basename).toHaveBeenCalledWith(solutionPath);
        });

        it('getRunId should return the base name of the run folder path', () => {
            const runFolderPath = '/path/to/run-id' as IRunDirPath;
            expect(folderManager.getRunId(runFolderPath)).toBe('run-id');
            expect(mockedPath.basename).toHaveBeenCalledWith(runFolderPath);
        });

        it('getTempDirPath should return the correct temp directory path', () => {
            expect(folderManager.getTempDirPath()).toBe(`${baseDir}/temp`);
        });

        it('getResultDirPath should return the correct results directory path', () => {
            expect(folderManager.getResultDirPath()).toBe(`${baseDir}/results`);
        });

        it('getMainJsonPath should return the correct main.json path', () => {
            expect(folderManager.getMainJsonPath()).toBe(`${baseDir}/results/main.json`);
        });

        it('getRunResultDirPath should return the correct path for a run', () => {
            const runId = 'run-id' as IRunId;
            expect(folderManager.getRunResultDirPath(runId)).toBe(`${baseDir}/results/run-id`);
        });

        it('getTestCaseResultPath should return the correct path for a test case', () => {
            const runId = 'run-id' as IRunId;
            const testCaseNo = 1;
            expect(folderManager.getTestCaseResultPath(runId, testCaseNo)).toBe(`${baseDir}/results/run-id/test_1.json`);
        });
    });

    describe('generateNonce', () => {
        it('should generate a nonce from the current date', () => {
            const fixedDate = new Date('2023-10-27T10:00:00.000Z');
            const expectedNonce = '2023-10-27T10-00-00-000Z';
            jest.useFakeTimers().setSystemTime(fixedDate);

            expect(folderManager.generateNonce()).toBe(expectedNonce);

            jest.useRealTimers();
        });
    });

    describe('Directory Creation', () => {
        it('createTempDir should create the temp directory', () => {
            // reset mocks from constructor call
            mockFileManager.createDirectory.mockClear();
            folderManager.createTempDir();
            expect(mockFileManager.createDirectory).toHaveBeenCalledWith(`${baseDir}/temp`);
        });

        it('createResultDir should create the results directory', () => {
            // reset mocks from constructor call
            mockFileManager.createDirectory.mockClear();
            folderManager.createResultDir();
            expect(mockFileManager.createDirectory).toHaveBeenCalledWith(`${baseDir}/results`);
        });

        it('createRunFolder should create a directory for the run', () => {
            const runId = 'run-id' as IRunId;
            const expectedPath = `${baseDir}/results/run-id`;
            folderManager.createRunFolder(runId);
            expect(mockFileManager.createDirectory).toHaveBeenCalledWith(expectedPath);
        });
    });

    describe('JSON Management', () => {
        const solutionName = 'solution.cpp' as ISolutionName;
        const runId = 'run-id' as IRunId;
        const mainJsonPath = `${baseDir}/results/main.json` as IMainJsonPath;

        describe('readMainJson', () => {
            it('should return an empty object if main.json does not exist', () => {
                mockFileManager.exists.mockReturnValue(false);
                expect(folderManager.readMainJson()).toEqual({});
            });

            it('should return an empty object if main.json is malformed', () => {
                mockFileManager.exists.mockReturnValue(true);
                mockFileManager.readFile.mockReturnValue('invalid json');
                expect(folderManager.readMainJson()).toEqual({});
            });

            it('should return the parsed JSON object if main.json is valid', () => {
                const mainJson: IMainJson = { [solutionName]: [runId] };
                mockFileManager.exists.mockReturnValue(true);
                mockFileManager.readFile.mockReturnValue(JSON.stringify(mainJson));
                expect(folderManager.readMainJson()).toEqual(mainJson);
            });
        });

        describe('addSolutionToMainJson', () => {
            it('should add a new solution to an empty main.json', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue({});
                folderManager.addSolutionToMainJson(solutionName);
                const expectedJson: IMainJson = { [solutionName]: [] };
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });

            it('should not add a solution if it already exists', () => {
                const existingJson: IMainJson = { [solutionName]: [] };
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(existingJson);
                folderManager.addSolutionToMainJson(solutionName);
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(existingJson, null, 4));
            });
        });

        describe('addRunToMainJson', () => {
            it('should add a new solution and run if solution does not exist', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue({});
                folderManager.addRunToMainJson(solutionName, runId);
                const expectedJson: IMainJson = { [solutionName]: [runId] };
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });

            it('should add a run to an existing solution', () => {
                const existingJson: IMainJson = { [solutionName]: ['existing-run' as IRunId] };
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(existingJson);
                folderManager.addRunToMainJson(solutionName, runId);
                const expectedJson: IMainJson = { [solutionName]: ['existing-run' as IRunId, runId] };
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });
        });
    });

    describe('Workflow Methods', () => {
        const solutionName = 'solution.cpp' as ISolutionName;
        const solutionPath = `/path/to/${solutionName}` as ISolutionPath;
        const runId = 'run-id' as IRunId;

        describe('addSolution', () => {
            it('should call addSolutionToMainJson with the correct solution name', () => {
                jest.spyOn(folderManager, 'addSolutionToMainJson');
                mockedPath.basename.mockReturnValue(solutionName);

                folderManager.addSolution(solutionPath);

                expect(folderManager.addSolutionToMainJson).toHaveBeenCalledWith(solutionName);
                expect(mockedPath.basename).toHaveBeenCalledWith(solutionPath);
            });
        });

        describe('addRun', () => {
            it('should call createRunFolder and addRunToMainJson', () => {
                jest.spyOn(folderManager, 'createRunFolder');
                jest.spyOn(folderManager, 'addRunToMainJson');

                folderManager.addRun(solutionName, runId);

                expect(folderManager.createRunFolder).toHaveBeenCalledWith(runId);
                expect(folderManager.addRunToMainJson).toHaveBeenCalledWith(solutionName, runId);
            });
        });

        describe('initializeTestRun', () => {
            it('should call addRun', () => {
                jest.spyOn(folderManager, 'addRun');
                folderManager.initializeTestRun(solutionName, runId);
                expect(folderManager.addRun).toHaveBeenCalledWith(solutionName, runId);
            });
        });

        describe('saveResult', () => {
            it('should write the test result to the correct file path', () => {
                const runFolderPath = `${baseDir}/results/problemA.cpp/run1` as IRunDirPath;
                const result: IJsonTestResult = { testCase: 1, lastResult: 'OK' };
                const expectedFilePath = `${baseDir}/results/run1/test_1.json`;
                mockedPath.basename.mockReturnValue('run1' as IRunId);

                folderManager.saveResult(runFolderPath, result);

                expect(mockedPath.basename).toHaveBeenCalledWith(runFolderPath);
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                    expectedFilePath,
                    JSON.stringify(result, null, 4)
                );
            });
        });
    });

    describe('Data Retrieval', () => {
        const solutionName = 'solution.cpp' as ISolutionName;
        const runId = 'run-id' as IRunId;
        const mainJson: IMainJson = { [solutionName]: [runId], ['other.cpp' as ISolutionName]: [] };

        describe('getAllSolutions', () => {
            it('should return all solution names from main.json', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(mainJson);
                const solutions = folderManager.getAllSolutions();
                expect(solutions).toEqual(['solution.cpp', 'other.cpp']);
            });

            it('should return an empty array on error', () => {
                jest.spyOn(folderManager, 'readMainJson').mockImplementation(() => { throw new Error(); });
                const solutions = folderManager.getAllSolutions();
                expect(solutions).toEqual([]);
            });
        });

        describe('getAllRuns', () => {
            it('should return all runs for a given solution', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(mainJson);
                const runs = folderManager.getAllRuns(solutionName);
                expect(runs).toEqual([runId]);
            });

            it('should return an empty array if solution does not exist', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(mainJson);
                const runs = folderManager.getAllRuns('nonexistent.cpp' as ISolutionName);
                expect(runs).toEqual([]);
            });

            it('should return an empty array on error', () => {
                jest.spyOn(folderManager, 'readMainJson').mockImplementation(() => { throw new Error(); });
                const runs = folderManager.getAllRuns(solutionName);
                expect(runs).toEqual([]);
            });
        });

        describe('getAllTestResults', () => {
            const runFolderPath = `${baseDir}/results/${runId}` as IRunDirPath;

            it('should return an empty array if the run folder does not exist', () => {
                mockFileManager.exists.mockReturnValue(false);
                const results = folderManager.getAllTestResults(runId);
                expect(mockFileManager.exists).toHaveBeenCalledWith(runFolderPath);
                expect(results).toEqual([]);
            });

            it('should return all parsed test results', () => {
                const testResult1: IJsonTestResult = { testCase: 1, lastResult: 'Passed' };
                const testResult2: IJsonTestResult = { testCase: 2, lastResult: 'WA' };
                mockFileManager.exists.mockReturnValue(true);
                mockFileManager.listDirectory.mockReturnValue(['test_1.json', 'test_2.json', 'other.txt']);
                mockFileManager.readFile
                    .mockReturnValueOnce(JSON.stringify(testResult1))
                    .mockReturnValueOnce(JSON.stringify(testResult2));

                const results = folderManager.getAllTestResults(runId);

                expect(results).toEqual([testResult1, testResult2]);
            });

            it('should handle parsing errors gracefully', () => {
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
                const testResult1: IJsonTestResult = { testCase: 1, lastResult: 'Passed' };
                mockFileManager.exists.mockReturnValue(true);
                mockFileManager.listDirectory.mockReturnValue(['test_1.json', 'test_2_bad.json']);
                mockFileManager.readFile
                    .mockReturnValueOnce(JSON.stringify(testResult1))
                    .mockReturnValueOnce('invalid json');

                const results = folderManager.getAllTestResults(runId);

                expect(results).toEqual([testResult1]);
                expect(consoleErrorSpy).toHaveBeenCalled();
                consoleErrorSpy.mockRestore();
            });
        });
    });

    describe('Deletion Methods', () => {
        const solutionName = 'solution.cpp' as ISolutionName;
        const runId = 'run-id' as IRunId;
        const otherRunId = 'other-run-id' as IRunId;
        const mainJson: IMainJson = { [solutionName]: [runId, otherRunId] };
        const mainJsonPath = `${baseDir}/results/main.json` as IMainJsonPath;

        describe('deleteSolution', () => {
            it('should delete all runs and the solution from main.json', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(JSON.parse(JSON.stringify(mainJson))); // deep copy
                jest.spyOn(folderManager, 'deleteRun').mockImplementation(() => { });

                folderManager.deleteSolution(solutionName);

                expect(folderManager.deleteRun).toHaveBeenCalledWith(runId);
                expect(folderManager.deleteRun).toHaveBeenCalledWith(otherRunId);
                const expectedJson: IMainJson = {};
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });

            it('should not throw if solution does not exist', () => {
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue({});
                expect(() => folderManager.deleteSolution(solutionName)).not.toThrow();
                expect(mockFileManager.writeFile).not.toHaveBeenCalled();
            });
        });

        describe('deleteRun', () => {
            it('should delete the run folder and remove the run from main.json', () => {
                const runFolderPath = `${baseDir}/results/${runId}`;
                mockFileManager.exists.mockReturnValue(true);
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(JSON.parse(JSON.stringify(mainJson)));
                jest.spyOn(folderManager, 'getAllSolutions').mockReturnValue([solutionName]);


                folderManager.deleteRun(runId);

                expect(mockFileManager.deleteDirectory).toHaveBeenCalledWith(runFolderPath);
                const expectedJson: IMainJson = { [solutionName]: [otherRunId] };
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });

            it('should not fail if run folder does not exist', () => {
                mockFileManager.exists.mockReturnValue(false);
                jest.spyOn(folderManager, 'readMainJson').mockReturnValue(JSON.parse(JSON.stringify(mainJson)));
                jest.spyOn(folderManager, 'getAllSolutions').mockReturnValue([solutionName]);

                folderManager.deleteRun(runId);

                expect(mockFileManager.deleteDirectory).not.toHaveBeenCalled();
                const expectedJson: IMainJson = { [solutionName]: [otherRunId] };
                expect(mockFileManager.writeFile).toHaveBeenCalledWith(mainJsonPath, JSON.stringify(expectedJson, null, 4));
            });
        });

        describe('deleteTestResult', () => {
            it('should delete the test result file', () => {
                const testCaseNo = 1;
                const testCasePath = `${baseDir}/results/${runId}/test_${testCaseNo}.json`;
                mockFileManager.exists.mockReturnValue(true);

                folderManager.deleteTestResult(runId, testCaseNo);

                expect(mockFileManager.deleteFile).toHaveBeenCalledWith(testCasePath);
            });

            it('should not fail if the test result file does not exist', () => {
                mockFileManager.exists.mockReturnValue(false);
                expect(() => folderManager.deleteTestResult(runId, 1)).not.toThrow();
                expect(mockFileManager.deleteFile).not.toHaveBeenCalled();
            });
        });
    });

    describe('updateTestResult', () => {
        const runId = 'run-id' as IRunId;
        const newJsonResult: IJsonTestResult = { testCase: 1, lastResult: 'WA' };
        const testCasePath = `${baseDir}/results/${runId}/test_1.json`;

        it('should update the test result file if it exists', () => {
            mockFileManager.exists.mockReturnValue(true);

            folderManager.updateTestResult(runId, newJsonResult);

            expect(mockFileManager.exists).toHaveBeenCalledWith(testCasePath);
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(testCasePath, JSON.stringify(newJsonResult, null, 4));
        });

        it('should not write the file if the test case does not exist', () => {
            mockFileManager.exists.mockReturnValue(false);

            folderManager.updateTestResult(runId, newJsonResult);

            expect(mockFileManager.exists).toHaveBeenCalledWith(testCasePath);
            expect(mockFileManager.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should call fileManager.cleanup with the given paths', () => {
            const paths = ['/path1', '/path2'];
            folderManager.cleanup(paths);
            expect(mockFileManager.cleanup).toHaveBeenCalledWith(paths);
        });
    });
});
