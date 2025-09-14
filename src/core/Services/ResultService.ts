
import { IResultService } from '../Interfaces/services';
import { IJsonTestResult, ITestPaths } from '../Interfaces/datastructures';
import { ICPSTFolderManager, IResultManager } from '../Interfaces/classes';
import * as path from 'path';

export class ResultService implements IResultService {
    constructor(
        private readonly _resultManager : IResultManager,
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public initialize(solutionPath : string): ITestPaths {
        const paths = this._cpstFolderManager.setup(solutionPath);
        this._resultManager.initialize(paths);
        return paths;
    }

    public saveResult(result: IJsonTestResult, paths: ITestPaths): void {
        this._resultManager.save(result, paths);
    }
}
