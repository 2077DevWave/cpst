import * as path from 'path';
import { CPSTFolderManager } from './Managers/CPSTFolderManager';
import { CompilationManager } from './CompileAndRun/CompilationManager';
import { TestRunner } from './CompileAndRun/TestRunner';
import { ResultManager } from './Managers/ResultManager';
import { ICompiler, IExecutor, IFileManager, IStressTestEngine, ITestReporter } from './Interfaces/classes';

export class StressTestEngine implements IStressTestEngine {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager,
        private readonly _reporter: ITestReporter,
        private readonly _baseDir: string
    ) {}

    public async runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void> {
        const CpstFolderManager = new CPSTFolderManager(this._fileManager, this._baseDir);
        const paths = CpstFolderManager.setup(solutionPath);

        const compilationManager = new CompilationManager(this._compiler, paths.tempDir);
        const executables = await compilationManager.compile(solutionPath, generatorValidatorPath, checkerPath);

        if (!executables) {
            this._reporter.reportError("Compilation failed.");
            CpstFolderManager.cleanup([paths.tempDir]);
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
            
            resultManager.save({
                testCase: i,
                lastResult: result.status,
                input: result.input,
                userOutput: result.output,
                execTime: result.duration,
                memoryUsed: result.memory,
                message: result.message
            });
            
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
        
        CpstFolderManager.cleanup([paths.tempDir]);
    }
}
