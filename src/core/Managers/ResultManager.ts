import * as path from 'path';
import { IFileManager, IResultManager, ICPSTFolderManager } from '../Interfaces/classes';
import { IJsonTestResult, ITestPaths } from '../Interfaces/datastructures';

export class ResultManager implements IResultManager {
    constructor(
        private readonly _cpstFolderManager: ICPSTFolderManager,
    ) {}

    public initialize(paths: ITestPaths): void {
        this._cpstFolderManager.initializeTestRun(path.basename(paths.solutionDir), path.basename(paths.runFolderPath), paths.mainJsonPath);
    }

    public save(result: IJsonTestResult, paths : ITestPaths): void {
        this._cpstFolderManager.saveResult(paths.runFolderPath, result);
    }
}
