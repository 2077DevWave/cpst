
import { ITestReporter, ICPSTFolderManager } from '../Interfaces/classes';
import { ITestPaths } from '../Interfaces/datastructures';
import { ICompilationService, IOrchestrationService, IResultService, ITestRunnerService } from '../Interfaces/services';

export class OrchestrationService implements IOrchestrationService {
    constructor(
        private readonly _compilationService: ICompilationService,
        private readonly _testRunnerService: ITestRunnerService,
        private readonly _resultService: IResultService,
        private readonly _cpstFolderManager: ICPSTFolderManager,
        private readonly _reporter: ITestReporter
    ) {}

    public async run(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void> {
        const paths : ITestPaths = this._resultService.initialize(solutionPath);
        const executables = await this._compilationService.compile(solutionPath, generatorValidatorPath, checkerPath);

        if (!executables) {
            this._reporter.reportError("Compilation failed.");
            this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDir()]);
            return;
        }

        const numTests = 100;
        for (let i = 1; i <= numTests; i++) {
            this._reporter.reportProgress({ command: 'testResult', status: 'Running', testCase: i });

            const result = await this._testRunnerService.runSingleTest(executables.solutionExec, executables.generatorExec, executables.checkerExec);
            
            const resultToSave = {
                testCase: i,
                lastResult: result.status,
                input: result.input,
                userOutput: result.output,
                execTime: result.duration,
                memoryUsed: result.memory,
                message: result.message
            };

            this._resultService.saveResult(resultToSave, paths);
            
            const progress = {
                command: 'testResult',
                status: result.status,
                testCase: i,
                input: result.input,
                output: result.output,
                time: result.duration,
                memory: result.memory,
                message: result.message
            };
            this._reporter.reportProgress(progress);

            if (result.status !== 'OK') {
                break;
            }
        }
        
        this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDir()]);
    }
}
