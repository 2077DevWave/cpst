
import { IResultService } from '../Interfaces/services';
import { IJsonTestResult, IRunId, ISolutionPath, ITestPaths } from '../Interfaces/datastructures';
import { ICPSTFolderManager} from '../Interfaces/classes';
import * as path from 'path';

export class ResultService implements IResultService {
    constructor(
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public initialize(solutionPath : string): ITestPaths {
        const runId: IRunId = this._cpstFolderManager.generateNonce() as IRunId;
        this._cpstFolderManager.addRun(this._cpstFolderManager.getSolutionName(solutionPath as ISolutionPath) ,runId);
        return this._cpstFolderManager.getTestPaths(solutionPath as ISolutionPath, runId);
    }

    public saveResult(result: IJsonTestResult, paths: ITestPaths): void {
        this._cpstFolderManager.saveResult(paths.runFolderPath, result);
    }
}
