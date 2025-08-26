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

export interface IJsonTestResult {
    testCase: number;
    lastResult?: string;
    input?: string;
    userOutput?: string;
    execTime?: number;
    memoryUsed?: number;
    message?: string;
}