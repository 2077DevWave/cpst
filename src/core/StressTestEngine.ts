import * as path from 'path';
import { ICompiler, IExecutor, IFileManager, IStressTestEngine, ITestReporter } from './interfaces';
import { WorkspaceManager } from './WorkspaceManager';
import { CompilationManager } from './CompilationManager';
import { TestRunner } from './TestRunner';
import { ResultManager } from './ResultManager';

export class StressTestEngine implements IStressTestEngine {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager,
        private readonly _reporter: ITestReporter,
        private readonly _baseDir: string
    ) {}

    public async runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void> {
        const workspaceManager = new WorkspaceManager(this._fileManager, this._baseDir);
        const paths = workspaceManager.setup(solutionPath);

        const compilationManager = new CompilationManager(this._compiler, paths.tempDir);
        const executables = await compilationManager.compile(solutionPath, generatorValidatorPath, checkerPath);

        if (!executables) {
            this._reporter.reportError("Compilation failed.");
            workspaceManager.cleanup([paths.tempDir]);
            return;
        }

        const solutionName = path.basename(solutionPath);
        const runFolderName = path.basename(paths.runFolderPath);
        const resultManager = new ResultManager(this._fileManager, paths.runFolderPath, paths.mainJsonPath, solutionName, runFolderName);
        resultManager.initialize();

        const testRunner = new TestRunner(this._executor, this._fileManager, paths.tempDir);

        const numTests = 100;
        for (let i = 1; i <= numTests; i++) {
            this._reporter.reportProgress({ command: 'testResult', status: 'Running', testCase: i });

            const result = await testRunner.run(executables.solutionExec, executables.generatorExec, executables.checkerExec);
            
            resultManager.save(i, result);
            
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
        
        workspaceManager.cleanup([paths.tempDir]);
    }
}
