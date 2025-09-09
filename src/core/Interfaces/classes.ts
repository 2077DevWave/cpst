import * as vscode from 'vscode';
import { IExecutablePaths, IJsonTestResult, ITestPaths, ITestRunResult } from './datastructures';

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
    listDirectory(path: string): string[];
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

export interface ICPSTFolderManager {
    setup(solutionPath: string): ITestPaths;
    initializeTestRun(solutionName: string, runFolderName: string, mainJsonPath: string): void;
    saveResult(runFolderPath: string, result: IJsonTestResult): void;
    getSolutions(): string[];
    getRuns(solutionName: string): string[];
    getTestResults(solutionName: string, runId: string): IJsonTestResult[];
    cleanup(paths: string[]): void;
}
