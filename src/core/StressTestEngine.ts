import * as path from 'path';
import { ICompiler, IExecutor, IFileManager, IStressTestEngine, ITestReporter } from './interfaces';

export class StressTestEngine implements IStressTestEngine {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager,
        private readonly _reporter: ITestReporter,
        private readonly _baseDir: string
    ) {}

    public async runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<void> {
        const tempDir = path.join(this._baseDir, 'temp');
        this._fileManager.createDirectory(tempDir);

        const solutionExec = path.join(tempDir, "solution_exec");
        const generatorExec = path.join(tempDir, "generator_exec");
        const checkerExec = path.join(tempDir, "checker_exec");

        if (!await this._compiler.compile(solutionPath, solutionExec)) return;
        if (!await this._compiler.compile(generatorValidatorPath, generatorExec)) return;
        if (!await this._compiler.compile(checkerPath, checkerExec)) return;

        const resultsDir = path.join(this._baseDir, 'results');
        this._fileManager.createDirectory(resultsDir);

        const solutionName = path.basename(solutionPath);
        const solutionDir = path.join(resultsDir, solutionName);
        this._fileManager.createDirectory(solutionDir);
        
        const mainJsonPath = path.join(resultsDir, 'main.json');
        let mainJson: { [key: string]: string[] } = {};
        if (this._fileManager.exists(mainJsonPath)) {
            try {
                mainJson = JSON.parse(this._fileManager.readFile(mainJsonPath));
            } catch (e) {
                mainJson = {};
            }
        }

        const runFolderName = new Date().toISOString().replace(/[:.]/g, '-');
        const runFolderPath = path.join(solutionDir, runFolderName);
        this._fileManager.createDirectory(runFolderPath);

        if (!mainJson[solutionName]) {
            mainJson[solutionName] = [];
        }
        mainJson[solutionName].push(runFolderName);
        this._fileManager.writeFile(mainJsonPath, JSON.stringify(mainJson, null, 4));

        const numTests = 100;
        for (let i = 1; i <= numTests; i++) {
            this._reporter.reportProgress({ command: 'testResult', status: 'Running', testCase: i });

            const { stdout: testCase, stderr: genError } = await this._executor.runWithLimits(generatorExec, '');
            if (genError) {
                const result = { command: 'testResult', status: 'Error', message: `Generator error: ${genError}` };
                this._reporter.reportProgress(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message });
                break;
            }

            const { stdout: userOutput, stderr: solError, duration, memory, status: solStatus } = await this._executor.runWithLimits(solutionExec, testCase);
            
            if (solStatus !== 'OK') {
                const result = { command: 'testResult', status: solStatus, testCase: i, input: testCase, time: duration, memory: memory };
                this._reporter.reportProgress(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, input: result.input, exec_time: result.time, memory_used: result.memory });
                break;
            }
            
            if (solError) {
                 const result = { command: 'testResult', status: 'RUNTIME_ERROR', message: `Solution runtime error: ${solError}`, testCase: i, input: testCase, time: duration, memory: memory };
                 this._reporter.reportProgress(result);
                 this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message, input: result.input, exec_time: result.time, memory_used: result.memory });
                 break;
            }
            
            const inputFile = path.join(tempDir, 'input.txt');
            const outputFile = path.join(tempDir, 'output.txt');
            this._fileManager.writeFile(inputFile, testCase);
            this._fileManager.writeFile(outputFile, userOutput);

            try {
                await this._executor.runWithLimits(`${checkerExec} ${inputFile} ${outputFile}`, '');
                const result = { command: 'testResult', status: 'OK', testCase: i, time: duration, memory: memory, input: testCase, output: userOutput};
                this._reporter.reportProgress(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, exec_time: result.time, memory_used: result.memory, input: result.input, output: result.output});
            } catch (error: any) {
                if (error.code === 1) { // WA
                    const result = { command: 'testResult', status: 'WA', testCase: i, input: testCase, output: userOutput, time: duration, memory: memory };
                    this._reporter.reportProgress(result);
                    this.saveTestResult(runFolderPath, i, { status: result.status, input: result.input, output: result.output, exec_time: result.time, memory_used: result.memory });
                    break; 
                } else { // Checker error
                    const result = { command: 'testResult', status: 'Error', message: `Checker error: ${error.stderr}` };
                    this._reporter.reportProgress(result);
                    this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message });
                    break;
                }
            }
        }
        
        this._fileManager.cleanup([tempDir]);
    }

    private saveTestResult(
        runFolderPath: string, 
        testCaseNumber: number, 
        result: { 
            status: string, 
            input?: string, 
            output?: string, 
            exec_time?: number, 
            memory_used?: number, 
            message?: string 
        }
    ) {
        const resultFilePath = path.join(runFolderPath, `test_${testCaseNumber}.json`);
        const resultData = {
            test_case: testCaseNumber,
            last_result: result.status,
            input: result.input || "",
            user_output: result.output || "",
            exec_time: result.exec_time || 0,
            memory_used: result.memory_used || 0,
            message: result.message || ""
        };
        this._fileManager.writeFile(resultFilePath, JSON.stringify(resultData, null, 4));
    }
}