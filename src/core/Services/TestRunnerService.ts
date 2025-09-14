
import { ITestRunnerService } from '../Interfaces/services';
import { ITestRunResult } from '../Interfaces/datastructures';
import { ICPSTFolderManager, IExecutor, IFileManager } from '../Interfaces/classes';
import { TestRunner } from '../CompileAndRun/TestRunner';

export class TestRunnerService implements ITestRunnerService {
    constructor(
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager,
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public async runSingleTest(solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult> {
        const tempDir = this._cpstFolderManager.getTempDir();
        const testRunner = new TestRunner(this._executor, this._fileManager, tempDir);
        return testRunner.run(solutionExec, generatorExec, checkerExec);
    }
}
