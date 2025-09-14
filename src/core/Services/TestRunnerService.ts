
import { ITestRunnerService } from '../Interfaces/services';
import { ITestRunResult } from '../Interfaces/datastructures';
import { ICPSTFolderManager, ITestRunner } from '../Interfaces/classes';

export class TestRunnerService implements ITestRunnerService {
    constructor(
        private readonly _cpstFolderManager: ICPSTFolderManager,
        private readonly _testRunner: ITestRunner
    ) {}

    public async runSingleTest(solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult> {
        const tempDir = this._cpstFolderManager.getTempDir();
        return this._testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);
    }
}
