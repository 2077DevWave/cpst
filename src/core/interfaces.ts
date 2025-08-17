
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
