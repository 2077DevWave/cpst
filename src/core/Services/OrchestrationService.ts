
import { ITestReporter, ICPSTFolderManager } from '../Interfaces/classes';
import { IJsonTestResult, IRunId, ITestPaths } from '../Interfaces/datastructures';
import { ICompilationService, IOrchestrationService, IResultService, ITestRunnerService } from '../Interfaces/services';

export class OrchestrationService implements IOrchestrationService {
    constructor(
        private readonly _compilationService: ICompilationService,
        private readonly _testRunnerService: ITestRunnerService,
        private readonly _resultService: IResultService,
        private readonly _cpstFolderManager: ICPSTFolderManager,
        private readonly _reporter: ITestReporter
    ) {}

    public async run(solutionPath: string, generatorValidatorPath: string, checkerPath: string, numTests: number): Promise<void> {
        const paths : ITestPaths = this._resultService.initialize(solutionPath);
        const executables = await this._compilationService.compile(solutionPath, generatorValidatorPath, checkerPath);

        if (!executables) {
            this._reporter.reportError("Compilation failed.");
            this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDirPath()]);
            return;
        }

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
                message: result.message,
                reason: result.reason
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
                message: result.message,
                reason: result.reason
            };
            this._reporter.reportProgress(progress);
        }
        
        this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDirPath()]);
    }

    public async reRun(solutionPath: string, checkerPath: string, testCases: { [key: IRunId]: IJsonTestResult[] }): Promise<void> {
        const executables = await this._compilationService.compileForRerun(solutionPath, checkerPath);

        if (!executables) {
            this._reporter.reportError("Compilation failed.");
            this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDirPath()]);
            return;
        }

        for(const runId of Object.keys(testCases) as IRunId[]){
            for (const test of testCases[runId]) {
                this._reporter.reportProgress({ command: 'testResult', status: 'Running', testCase: test.testCase });

                const result = await this._testRunnerService.runSingleTestWithInput(executables.solutionExec, executables.checkerExec, test.input || "");
                
                const resultToSave : IJsonTestResult = {
                    testCase: test.testCase,
                    lastResult: result.status,
                    input: result.input,
                    userOutput: result.output,
                    execTime: result.duration,
                    memoryUsed: result.memory,
                    message: result.message,
                    reason: result.reason
                };

                this._resultService.updateResult(resultToSave, runId);
                
                const progress = {
                    command: 'testResult',
                    status: result.status,
                    testCase: test.testCase,
                    input: result.input,
                    output: result.output,
                    time: result.duration,
                    memory: result.memory,
                    message: result.message,
                    reason: result.reason
                };
                this._reporter.reportProgress(progress);
            }
        }
        
        this._cpstFolderManager.cleanup([this._cpstFolderManager.getTempDirPath()]);
    }
}
