import * as vscode from 'vscode';
import { IExecutablePaths, IJsonTestResult, ITestPaths, ITestRunResult } from './datastructures';

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
}

/**
 * Defines the contract for managing test results.
 */
export interface IResultManager {
    /**
     * Initializes the result storage for a new test run.
     */
    initialize(paths: ITestPaths): void;
    /**
     * Saves the result of a single test case.
     * @param result The test result to save.
     */
    save(result: IJsonTestResult, paths: ITestPaths): void;
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
}

/**
 * Defines the contract for managing the .cpst folder structure.
 */
export interface ICPSTFolderManager {
    /**
     * Sets up the necessary directories for a test run.
     * @param solutionPath The path to the solution file.
     * @returns An object containing the paths to the created directories.
     */
    setup(solutionPath: string): ITestPaths;
    /**
     * Initializes the main JSON file for a new test run.
     * @param solutionName The name of the solution file.
     * @param runFolderName The name of the folder for the current run.
     * @param mainJsonPath The path to the main JSON file.
     */
    initializeTestRun(solutionName: string, runFolderName: string, mainJsonPath: string): void;
    /**
     * Saves a test result to a JSON file.
     * @param runFolderPath The path to the folder for the current run.
     * @param result The result to save.
     */
    saveResult(runFolderPath: string, result: IJsonTestResult): void;
    /**
     * Gets a list of all solutions that have been tested.
     * @returns An array of solution names.
     */
    getSolutions(): string[];
    /**
     * Gets a list of all test runs for a given solution.
     * @param solutionName The name of the solution.
     * @returns An array of run folder names (timestamps).
     */
    getRuns(solutionName: string): string[];
    /**
     * Retrieves all test results for a specific test run.
     * @param solutionName The name of the solution.
     * @param runId The ID of the test run (timestamp).
     * @returns An array of test results.
     */
    getTestResults(solutionName: string, runId: string): IJsonTestResult[];
    /**
     * Cleans up temporary files and directories.
     * @param paths An array of paths to delete.
     */
    cleanup(paths: string[]): void;
    /**
     * Gets the path to the temporary directory.
     * @returns The absolute path to the temporary directory.
     */
    getTempDir(): string;
}
