import * as path from 'path';
import { IExecutor, IFileManager, ITestRunner } from '../Interfaces/classes';
import { ITestRunResult } from '../Interfaces/datastructures';

export class TestRunner implements ITestRunner {
    constructor(
        private readonly _executor: IExecutor,
        private readonly _fileManager: IFileManager
    ) { }

    public async run(tempDir: string, solutionExec: string, generatorExec: string, checkerExec: string): Promise<ITestRunResult> {
        const { stdout: testCase, stderr: genError } = await this._executor.runWithLimits(generatorExec, '');
        if (genError) {
            return { status: 'Error', message: `Generator error: ${genError}` };
        }

        return this.runWithInput(tempDir, solutionExec, checkerExec, testCase);
    }

    public async runWithInput(tempDir: string, solutionExec: string, checkerExec: string, input: string): Promise<ITestRunResult> {
        const { stdout: userOutput, stderr: solError, duration, memory, status: solStatus } = await this._executor.runWithLimits(solutionExec, input);

        if (solStatus !== 'OK') {
            return { status: solStatus, input: input, duration, memory };
        }

        if (solError) {
            return { status: 'RUNTIME_ERROR', message: `Solution runtime error: ${solError}`, input: input, duration, memory };
        }

        const inputFile = path.join(tempDir, 'input.txt');
        const outputFile = path.join(tempDir, 'output.txt');
        this._fileManager.writeFile(inputFile, input);
        this._fileManager.writeFile(outputFile, userOutput);

        const checkerResult = await this._executor.runRaw(checkerExec, [inputFile, outputFile]);

        if (checkerResult.code === 0) { // OK
            return { status: 'OK', duration, memory, input: input, output: userOutput };
        } else if (checkerResult.code === 1) { // WA
            return { status: 'WA', input: input, output: userOutput, duration, memory, reason: checkerResult.stderr };
        } else { // Checker error
            return { status: 'Error', message: `Checker error: ${checkerResult.stderr}` };
        }
    }
}
