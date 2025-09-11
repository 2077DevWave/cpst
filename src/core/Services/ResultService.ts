
import { IResultService } from '../Interfaces/services';
import { IJsonTestResult } from '../Interfaces/datastructures';
import { IFileManager } from '../Interfaces/classes';
import { ResultManager } from '../Managers/ResultManager';
import { CPSTFolderManager } from '../Managers/CPSTFolderManager';
import * as path from 'path';

export class ResultService implements IResultService {
    private _resultManager: ResultManager | null = null;
    private _solutionPath: string | null = null;

    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _cpstFolderManager: CPSTFolderManager
    ) {}

    public setSolutionPath(solutionPath: string) {
        this._solutionPath = solutionPath;
    }

    public initialize(): void {
        if (!this._solutionPath) {
            throw new Error("Solution path not set in ResultService.");
        }
        const paths = this._cpstFolderManager.getPaths(this._solutionPath);
        const solutionName = path.basename(this._solutionPath);
        const runFolderName = path.basename(paths.runFolderPath);
        this._resultManager = new ResultManager(this._fileManager, paths.runFolderPath, paths.mainJsonPath, solutionName, runFolderName);
        this._resultManager.initialize();
    }

    public saveResult(result: IJsonTestResult): void {
        if (!this._resultManager) {
            throw new Error("ResultManager not initialized. Call initialize() first.");
        }
        this._resultManager.save(result);
    }
}
