import * as vscode from 'vscode';

/**
 * Represents the result of a single test case execution.
 */
export interface ITestResult {
    /** The identifier for the test case. */
    testCase: string;
    /** The output produced by the user's solution. */
    userOutput: string;
    /** The expected correct output. */
    correctOutput: string;
    /** The status of the test case result. */
    type: 'Mismatch' | 'TLE' | 'Passed' | 'Error' | 'MLE' | 'WA' | 'OK' | 'Running' | 'RUNTIME_ERROR';
    /** The timestamp of when the test was executed. */
    timestamp: string;
    /** The input for the test case. */
    input?: string;
    /** The final output after checking. */
    output?: string;
    /** The execution time in milliseconds. */
    time?: number;
    /** The memory used in kilobytes. */
    memory?: number;
    /** Any additional message or error information. */
    message?: string;
}

/**
 * Defines the paths to the compiled executable files.
 */
export interface IExecutablePaths {
    /** The path to the compiled solution executable. */
    solutionExec: string;
    /** The path to the compiled generator/validator executable. */
    generatorExec: string;
    /** The path to the compiled checker executable. */
    checkerExec: string;
}

/**
 * Represents the outcome of a single test run.
 */
export interface ITestRunResult {
    /** The status of the test run. */
    status: 'OK' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'Error' | 'RUNTIME_ERROR' | string;
    /** The input that caused the result. */
    input?: string;
    /** The output from the user's solution. */
    output?: string;
    /** The execution duration in milliseconds. */
    duration?: number;
    /** The memory consumed in kilobytes. */
    memory?: number;
    /** Any message associated with the test run, e.g., an error message. */
    message?: string;
    /** The reason for the result, provided by the checker. */
    reason?: string;
}

/**
 * Defines the directory and file paths required for a stress test run.
 */
export interface ITestPaths {
    /** The temporary directory for compilation and execution. */
    tempDir: ITempDirPath;
    /** The root directory where all results are stored. */
    resultsDir: IResultDirPath;
    /** The directory specific to the solution being tested. */
    solutionPath: ISolutionPath;
    /** The directory for a specific test run, identified by a timestamp. */
    runFolderPath: IRunDirPath;
    /** The path to the main JSON file that tracks all test runs. */
    mainJsonPath: IMainJsonPath;
}

/**
 * Represents the result of executing a command.
 */
export interface IExecutionResult {
    /** The standard output of the command. */
    stdout: string;
    /** The standard error output of the command. */
    stderr: string;
    /** The execution duration in milliseconds. */
    duration: number; // in milliseconds
    /** The memory used in kilobytes (currently not implemented). */
    memory: number;   // in KB (currently not implemented)
    /** The final status of the execution. */
    status: string;
}

/**
 * Represents the raw result from a child process execution.
 */
export interface IRawExecutionResult {
    /** The standard output from the process. */
    stdout: string;
    /** The standard error output from the process. */
    stderr: string;
    /** The execution duration in milliseconds. */
    duration: number;
    /** The exit code of the process, or null if it terminated via a signal. */
    code: number | null;
    /** The signal that terminated the process, or null if it exited normally. */
    signal: string | null;
    /** An error object if the process failed to spawn. */
    error?: Error;
}

/**
 * Configuration for execution options, such as timeouts and buffer sizes.
 */
export interface IExecutionOptionsConfig {
    /** The maximum execution time in milliseconds. */
    timeout: number;
    /** The maximum size of the stdout/stderr buffer in bytes. */
    maxBuffer: number;
}

/**
 * Represents a test result as stored in a JSON file.
 */
export interface IJsonTestResult {
    /** The sequential number of the test case. */
    testCase: number;
    /** The final result status of the test case. */
    lastResult?: string;
    /** The input for the test case. */
    input?: string;
    /** The output from the user's solution. */
    userOutput?: string;
    /** The execution time in milliseconds. */
    execTime?: number;
    /** The memory used in kilobytes. */
    memoryUsed?: number;
    /** Any message associated with the result, e.g., an error message. */
    message?: string;
    /** The reason for the result, provided by the checker. */
    reason?: string;
}

// A generic helper type to create a branded type
// K is the base type (e.g., string)
// T is the unique brand name (e.g., "SolutionPath")
export type Brand<K, T> = K & { __brand: T };

// Define unique path types using the Brand helper
export type ISolutionPath = Brand<string, 'ISolutionDirPath'>;
export type IRunDirPath = Brand<string, 'IRunDirPath'>;
export type IResultDirPath = Brand<string, 'IResultDirPath'>;
export type ITestCaseJsonPath = Brand<string, 'ITestCaseJsonPath'>;
export type IMainJsonPath = Brand<string, 'IMainJsonPath'>;
export type ITempDirPath = Brand<string, 'ITempDirPath'>;

export type ISolutionName = Brand<string, 'ISolutionName'>;
export type IRunId = Brand<string, 'IRunId'>;

export type IMainJson = { [key: ISolutionName]: IRunId[] };