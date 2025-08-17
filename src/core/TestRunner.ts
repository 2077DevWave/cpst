import * as path from 'path';
import { IExecutor, IFileManager, ITestRunResult, ITestRunner} from './interfaces';

export class TestRunner implements ITestRunner{
    constructor(
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager,
        private readonly _tempDir: string
    ) {}

    public async run(solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult> {
        const { stdout: testCase, stderr: genError } = await this._executor.runWithLimits(generatorExec, '');
        if (genError) {
            return { status: 'Error', message: `Generator error: ${genError}` };
        }

        const { stdout: userOutput, stderr: solError, duration, memory, status: solStatus } = await this._executor.runWithLimits(solutionExec, testCase);
        
        if (solStatus !== 'OK') {
            return { status: solStatus, input: testCase, duration, memory };
        }
        
        if (solError) {
            return { status: 'RUNTIME_ERROR', message: `Solution runtime error: ${solError}`, input: testCase, duration, memory };
        }
        
        const inputFile = path.join(this._tempDir, 'input.txt');
        const outputFile = path.join(this._tempDir, 'output.txt');
        this._fileManager.writeFile(inputFile, testCase);
        this._fileManager.writeFile(outputFile, userOutput);

        const checkerResult = await this._executor.runWithLimits(`${checkerExec} ${inputFile} ${outputFile}`, '');

        // This assumes IExecutionResult is updated to include an optional 'code' property.
        if (checkerResult.status === 'OK') {
            return { status: 'OK', duration, memory, input: testCase, output: userOutput };
        } else if (checkerResult.code === 1) { // WA from checker
            return { status: 'WA', input: testCase, output: userOutput, duration, memory };
        } else { // Checker error or other failures
            return { status: 'Error', message: `Checker failed with status '${checkerResult.status}': ${checkerResult.stderr}` };
        }
    }
}
