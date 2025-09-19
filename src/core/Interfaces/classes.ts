import * as vscode from 'vscode';
import { IExecutablePaths, IJsonTestResult, IRawExecutionResult, ITestPaths, ITestRunResult, ITempDirPath, ISolutionPath, IResultDirPath, IRunDirPath, ISolutionName, IRunId, IMainJson, IMainJsonPath, ITestCaseJsonPath } from './datastructures';

/**
 * @deprecated This interface is obsolete and will be removed. Use IOrchestrationService instead.
 * Defines the contract for the main stress testing engine.
 */
export interface IStressTestEngine {
    /**
     * Runs the entire stress testing process for a given solution.
     * @param solutionPath The file path to the C++ solution.
     * @param generatorValidatorPath The file path to the generator/validator.
     * @param checkerPath The file path to the checker.
     */
    runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void>;
}

/**
 * Defines the contract for a compiler.
 */
export interface ICompiler {
    /**
     * Compiles a source file to an executable.
     * @param filePath The path to the source file.
     * @param execPath The path where the executable will be created.
     * @returns A promise that resolves to true if compilation is successful, false otherwise.
     */
    compile(filePath: string, execPath: string): Promise<boolean>;
}

/**
 * Defines the contract for an executor that runs commands with resource limits.
 */
export interface IExecutor {
    /**
     * Runs a command with specified time and memory limits.
     * @param command The command to execute.
     * @param input The standard input to pass to the command.
     * @returns A promise that resolves with the execution result.
     */
    runWithLimits(command: string, input: string): Promise<{ stdout: string, stderr: string, duration: number, memory: number, status: string }>;

    /**
     * Runs a command without input and returns the raw execution result.
     * @param command The command to execute.
     * @param args The arguments to pass to the command.
     * @returns A promise that resolves with the raw execution result.
     */
    runRaw(command: string, args: string[]): Promise<IRawExecutionResult>;
}

/**
 * Defines the contract for file system operations.
 */
export interface IFileManager {
    /**
     * Creates a directory at the specified path.
     * @param path The directory path to create.
     */
    createDirectory(path: string): void;
    /**
     * Writes content to a file.
     * @param path The path of the file to write to.
     * @param content The content to write.
     */
    writeFile(path: string, content: string): void;
    /**
     * Reads the content of a file.
     * @param path The path of the file to read.
     * @returns The content of the file as a string.
     */
    readFile(path: string): string;
    /**
     * Checks if a file or directory exists at the specified path.
     * @param path The path to check.
     * @returns True if the path exists, false otherwise.
     */
    exists(path: string): boolean;
    /**
     * Deletes a file.
     * @param path The path of the file to delete.
     */
    deleteFile(path: string): void;
    /**
     * Deletes a directory recursively.
     * @param path The path of the directory to delete.
     */
    deleteDirectory(path: string): void;
    /**
     * Deletes a list of files or directories.
     * @param files The paths to clean up.
     */
    cleanup(files: string[]): void;
    /**
     * Lists the contents of a directory.
     * @param path The path of the directory to list.
     * @returns An array of file and directory names.
     */
    listDirectory(path: string): string[];
    /**
     * Derives the solution file URI from a related test file URI.
     * @param testUri The URI of the generator or checker file.
     * @returns The URI of the corresponding solution file.
     */
    getSolutionFileUri(testUri: vscode.Uri): vscode.Uri;
    /**
     * Gets the URI for the generator/validator file corresponding to a solution file.
     * @param solutionUri The URI of the solution file.
     * @returns The URI for the generator/validator file.
     */
    getGenValFileUri(solutionUri: vscode.Uri): vscode.Uri;
    /**
     * Gets the URI for the checker file corresponding to a solution file.
     * @param solutionUri The URI of the solution file.
     * @returns The URI for the checker file.
     */
    getCheckerFileUri(solutionUri: vscode.Uri): vscode.Uri;
    /**
     * Copies a file from a source to a destination.
     * @param source The source file URI.
     * @param destination The destination file URI.
     * @param options Options for the copy operation, e.g., overwrite.
     */
    copyFile(source: vscode.Uri, destination: vscode.Uri, options?: { overwrite: boolean }): Promise<void>;
}

/**
 * Defines the contract for reporting progress and results to the UI.
 */
export interface ITestReporter {
    /**
     * Reports a progress message to the UI.
     * @param message The message payload.
     */
    reportProgress(message: any): void;
    /**
     * Reports an error message to the user.
     * @param message The error message to display.
     */
    reportError(message: string): void;
    /**
     * Notifies the UI that the test history has been cleared.
     */
    reportHistoryCleared(): void;
    /**
     * Notifies the UI that a test run is in progress.
     */
    reportTestRunning(): void;
}

/**
 * Defines the contract for managing the compilation of all necessary source files.
 */
export interface ICompilationManager {
    /**
     * Compiles the solution, generator, and checker files.
     * @param solutionPath The file path to the C++ solution.
     * @param generatorValidatorPath The file path to the generator/validator.
     * @param checkerPath The file path to the checker.
     * @returns A promise that resolves with the paths to the executables, or null if compilation fails.
     */
    compile(tempDir: string, solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | null>;

    /**
     * Compiles the solution and checker files for re-running a test with existing input.
     * This is used when the generator is not needed.
     * @param tempDir The temporary directory for compilation.
     * @param solutionPath The file path to the C++ solution.
     * @param checkerPath The file path to the checker.
     * @returns A promise that resolves with the paths to the executables, or null if compilation fails.
     */
    compileForReRun(tempDir: string, solutionPath: string, checkerPath: string): Promise<IExecutablePaths | null>;
}

/**
 * Defines the contract for running a single test case.
 */
export interface ITestRunner {
    /**
     * Runs a single test case using the compiled executables.
     * @param solutionExec The path to the solution executable.
     * @param generatorExec The path to the generator executable.
     * @param checkerExec The path to the checker executable.
     * @returns A promise that resolves with the test run result.
     */
    run(tempDir: string, solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult>;

    /**
     * Runs a single test case with a given input.
     * @param tempDir The temporary directory for the test run.
     * @param solutionExec The path to the solution executable.
     * @param checkerExec The path to the checker executable.
     * @param input The input for the test case.
     * @returns A promise that resolves with the test run result.
     */
    runWithInput(tempDir: string, solutionExec: string, checkerExec: string, input: string): Promise<ITestRunResult>;
}

/**
 * Defines the contract for managing the .cpst folder structure.
 */
export interface ICPSTFolderManager {
    /**
     * Extracts the solution name from its path.
     * @param solutionPath The full path to the solution file.
     * @returns The base name of the solution file.
     */
    getSolutionName(solutionPath: ISolutionPath): ISolutionName;

    /**
     * Extracts the run ID from its path.
     * @param runFolderPath The full path to the run folder.
     * @returns The base name of the run folder (timestamp).
     */
    getRunId(runFolderPath: IRunDirPath): IRunId;

    /**
     * Gets the path to the temporary directory.
     * @returns The absolute path to the temporary directory.
     */
    getTempDirPath(): ITempDirPath;

    /**
     * Gets the path to the results directory.
     * @returns The absolute path to the results directory.
     */
    getResultDirPath(): IResultDirPath;

    /**
     * Gets the path to the main JSON file that tracks all solutions and runs.
     * @returns The absolute path to main.json.
     */
    getMainJsonPath(): IMainJsonPath;

    /**
     * Gets the path to a specific run's result directory.
     * @param solutionName The name of the solution.
     * @param runId The ID of the run.
     * @returns The absolute path to the run's result directory.
     */
    getRunResultDirPath(runId: IRunId): IRunDirPath;

    /**
     * Gets the path for a specific test case's JSON result file.
     * @param solutionName The name of the solution.
     * @param runId The ID of the run.
     * @param testCaseNo The test case number.
     * @returns The absolute path to the test case's result file.
     */
    getTestCaseResultPath(runId: IRunId, testCaseNo: number): ITestCaseJsonPath;

    /**
    * Extracts the test case number from its result file path.
    * @param testCasePath The path to the test case's result file.
    * @returns The test case number.
    */
    getTestCaseNo(testCasePath: ITestCaseJsonPath): number;

    /**
    * Reads and parses the JSON data for a specific test case result.
    * @param testCasePath The path to the test case's result file.
    * @returns The parsed test case result object.
    */
    getTestCaseResultData(testCasePath: ITestCaseJsonPath): IJsonTestResult;

    /**
    * Constructs all the necessary paths for a given test run.
    * @param solutionPath The path of the solution file.
    * @param runId The ID of the run.
    * @returns An object containing all relevant paths for the test run.
    */
    getTestPaths(solutionPath: ISolutionPath, runId: IRunId): ITestPaths;

    /**
     * Generates a unique nonce string based on the current timestamp.
     * @returns A unique string identifier.
     */
    generateNonce(): string;

    /**
     * Creates the temporary directory if it doesn't exist.
     * @returns The path to the temporary directory.
     */
    createTempDir(): void;

    /**
     * Creates the results directory if it doesn't exist.
     * @returns The path to the results directory.
     */
    createResultDir(): void;

    /**
     * Creates a directory for a specific test run.
     * @param solutionPath The path of the solution file.
     * @param runId The ID of the run.
     * @returns The path to the created run directory.
     */
    createRunFolder(runId: IRunId): void;

    /**
     * Adds a solution to the main JSON file.
     * @param solutionName The name of the solution to add.
     */
    addSolutionToMainJson(solutionName: ISolutionName): void;

    /**
     * Adds a run to a solution in the main JSON file.
     * @param solutionName The name of the solution.
     * @param runId The ID of the run to add.
     */
    addRunToMainJson(solutionName: ISolutionName, runId: IRunId): void;

    /**
     * Adds a new solution, creating its folder and updating the main JSON file.
     * @param solutionPath The path of the solution file.
     */
    addSolution(solutionPath : ISolutionPath): void;

    /**
     * Adds a new run for a solution, creating its folder and updating the main JSON file.
     * @param solutionName The name of the solution.
     * @param runId The ID of the run.
     */
    addRun(solutionName: ISolutionName, runId: IRunId): void;

    /**
     * Reads and parses the main JSON file.
     * @returns The parsed main JSON object.
     */
    readMainJson(): IMainJson;

    /**
     * Initializes a new test run by adding it to the tracking system.
     * @param solutionName The name of the solution.
     * @param runId The ID of the run.
     */
    initializeTestRun(solutionName: ISolutionName, runId: IRunId): void;

    /**
     * Saves a test result to a JSON file.
     * @param runFolderPath The path to the folder for the current run.
     * @param result The result to save.
     */
    saveResult(runFolderPath: IRunDirPath, result: IJsonTestResult): void;

    /**
     * Gets a list of all solutions that have been tested.
     * @returns An array of solution names.
     */
    getAllSolutions(): ISolutionName[];

    /**
     * Gets a list of all test runs for a given solution.
     * @param solutionName The name of the solution.
     * @returns An array of run folder names (timestamps).
     */
    getAllRuns(solutionName: ISolutionName): IRunId[];

    /**
     * Retrieves all test results for a specific test run.
     * @param solutionName The name of the solution.
     * @param runId The ID of the test run (timestamp).
     * @returns An array of test results.
     */
    getAllTestResults(runId: IRunId): IJsonTestResult[];

    /**
     * Deletes a solution and all its associated runs.
     * @param solutionName The name of the solution to delete.
     */
    deleteSolution(solutionName: ISolutionName): void;

    /**
     * Deletes a specific test run.
     * @param runId The ID of the run to delete.
     */
    deleteRun(runId: IRunId): void;

    /**
     * Deletes a specific test case result.
     * @param runId The ID of the run containing the test case.
     * @param testCaseNo The number of the test case to delete.
     */
    deleteTestResult(runId: IRunId, testCaseNo: number): void;

    /**
     * Updates an existing test result JSON file.
     * @param runId The ID of the run containing the test case.
     * @param newJsonResult The new result object to save.
     */
    updateTestResult(runId: IRunId, newJsonResult: IJsonTestResult): void;

    /**
     * Cleans up temporary files and directories.
     * @param paths An array of paths to delete.
     */
    cleanup(paths: string[]): void;
}

/**
 * Defines the contract for a command executor.
 */
export interface ICommandExecutor {
    /**
     * Executes a command.
     * @param command The command to execute.
     * @returns A promise that resolves with the stdout and stderr of the command.
     */
    execute(command: string): Promise<{ stdout: string; stderr: string }>;
}
