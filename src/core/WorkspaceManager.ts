import * as path from 'path';
import { IFileManager, ITestPaths, IWorkspaceManager } from './interfaces';



export class WorkspaceManager implements IWorkspaceManager{
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

    public cleanup(paths: string[]): void {
        this._fileManager.cleanup(paths);
    }
}
