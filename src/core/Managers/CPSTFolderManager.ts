import * as path from 'path';
import { IFileManager, ICPSTFolderManager } from '../Interfaces/classes';
import { ITestPaths, IJsonTestResult } from '../Interfaces/datastructures';

export class CPSTFolderManager implements ICPSTFolderManager {
    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _baseDir: string
    ) {}

    public setup(solutionPath: string): ITestPaths {
        const tempDir = path.join(this._baseDir, 'temp');
        this._fileManager.createDirectory(tempDir);

        const resultsDir = path.join(this._baseDir, 'results');
        this._fileManager.createDirectory(resultsDir);

        const solutionName = path.basename(solutionPath);
        const solutionDir = path.join(resultsDir, solutionName);
        this._fileManager.createDirectory(solutionDir);
        
        const runFolderName = new Date().toISOString().replace(/[:.]/g, '-');
        const runFolderPath = path.join(solutionDir, runFolderName);
        this._fileManager.createDirectory(runFolderPath);

        const mainJsonPath = path.join(resultsDir, 'main.json');

        return { tempDir, resultsDir, solutionDir, runFolderPath, mainJsonPath };
    }

    public initializeTestRun(solutionName: string, runFolderName: string, mainJsonPath: string): void {
        let mainJson: { [key: string]: string[] } = {};
        if (this._fileManager.exists(mainJsonPath)) {
            try {
                mainJson = JSON.parse(this._fileManager.readFile(mainJsonPath));
            } catch (e) {
                mainJson = {};
            }
        }

        if (!mainJson[solutionName]) {
            mainJson[solutionName] = [];
        }
        mainJson[solutionName].push(runFolderName);
        this._fileManager.writeFile(mainJsonPath, JSON.stringify(mainJson, null, 4));
    }

    public saveResult(runFolderPath: string, result: IJsonTestResult): void {
        const resultFilePath = path.join(runFolderPath, `test_${result.testCase}.json`);
        this._fileManager.writeFile(resultFilePath, JSON.stringify(result, null, 4));
    }

    public getSolutions(): string[] {
        const mainJsonPath = path.join(this._baseDir, 'results', 'main.json');
        if (!this._fileManager.exists(mainJsonPath)) {
            return [];
        }
        try {
            const mainJson = JSON.parse(this._fileManager.readFile(mainJsonPath));
            return Object.keys(mainJson);
        } catch (e) {
            return [];
        }
    }

    public getRuns(solutionName: string): string[] {
        const mainJsonPath = path.join(this._baseDir, 'results', 'main.json');
        if (!this._fileManager.exists(mainJsonPath)) {
            return [];
        }
        try {
            const mainJson = JSON.parse(this._fileManager.readFile(mainJsonPath));
            return mainJson[solutionName] || [];
        } catch (e) {
            return [];
        }
    }

    public getTestResults(solutionName: string, runId: string): IJsonTestResult[] {
        const runFolderPath = path.join(this._baseDir, 'results', solutionName, runId);
        if (!this._fileManager.exists(runFolderPath)) {
            return [];
        }

        const testFiles = this._fileManager.listDirectory(runFolderPath)
            .filter(file => file.startsWith('test_') && file.endsWith('.json'));

        const results: IJsonTestResult[] = [];
        for (const file of testFiles) {
            const filePath = path.join(runFolderPath, file);
            try {
                const content = this._fileManager.readFile(filePath);
                results.push(JSON.parse(content));
            } catch (e) {
                // Ignore files that can't be parsed
            }
        }
        return results;
    }

    public getTempDir(): string {
        return path.join(this._baseDir, 'temp');
    }

    public cleanup(paths: string[]): void {
        this._fileManager.cleanup(paths);
    }
}
