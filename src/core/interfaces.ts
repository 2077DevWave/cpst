import * as vscode from 'vscode';

export interface ITestResult {
    testCase: string;
    userOutput: string;
    correctOutput: string;
    type: 'Mismatch' | 'TLE' | 'Passed' | 'Error' | 'MLE' | 'WA' | 'OK' | 'Running' | 'RUNTIME_ERROR';
    timestamp: string;
    input?: string;
    output?: string;
    time?: number;
    memory?: number;
    message?: string;
}

export interface IStressTestEngine {
    runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void>;
}

export interface ICompiler {
    compile(filePath: string, execPath: string): Promise<boolean>;
}

export interface IExecutor {
    runWithLimits(command: string, input: string): Promise<{ stdout: string, stderr: string, duration: number, memory: number, status: string }>;
}

export interface IFileManager {
    createDirectory(path: string): void;
    writeFile(path: string, content: string): void;
    readFile(path: string): string;
    exists(path: string): boolean;
    cleanup(files: string[]): void;
    getSolutionFileUri(testUri: vscode.Uri): vscode.Uri;
    getGenValFileUri(solutionUri: vscode.Uri): vscode.Uri;
    getCheckerFileUri(solutionUri: vscode.Uri): vscode.Uri;
    copyFile(source: vscode.Uri, destination: vscode.Uri, options?: { overwrite: boolean }): Promise<void>;
}

export interface ITestReporter {
    reportProgress(message: any): void;
    reportError(message: string): void;
    reportHistoryCleared(): void;
    reportTestRunning(): void;
}

export interface IExecutablePaths {
    solutionExec: string;
    generatorExec: string;
    checkerExec: string;
}

export interface ITestRunResult {
    status: 'OK' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'Error' | 'RUNTIME_ERROR' | string;
    input?: string;
    output?: string;
    duration?: number;
    memory?: number;
    message?: string;
}

export interface ITestPaths {
    tempDir: string;
    resultsDir: string;
    solutionDir: string;
    runFolderPath: string;
    mainJsonPath: string;
}

export interface IExecutionResult {
    stdout: string;
    stderr: string;
    duration: number; // in milliseconds
    memory: number;   // in KB (currently not implemented)
    status: string;
}

export interface IRawExecutionResult {
    stdout: string;
    stderr: string;
    duration: number;
    code: number | null;
    signal: string | null;
    error?: Error;
}

export interface IExecutionOptionsConfig {
    timeout: number;
    maxBuffer: number;
}

export interface ICompilationManager {
    compile(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | null>;
}

export interface IResultManager {
    initialize(): void;
    save(result: IJsonTestResult): void;
}

export interface ITestRunner {
    run(solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult>;
}

export interface IWorkspaceManager {
    setup(solutionPath: string): ITestPaths;
    cleanup(paths: string[]): void;
}

export interface IJsonTestResult {
    test_case: number,
    last_result?: string,
    input?: string,
    user_output?: string,
    exec_time?: number,
    memory_used?: number,
    message?: string
}