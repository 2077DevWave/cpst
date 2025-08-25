
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { ICompiler, ITestReporter } from '../Interfaces/classes';

const execAsync = promisify(exec);

export class Compiler implements ICompiler {
    constructor(private readonly _reporter: ITestReporter) {}

    public async compile(filePath: string, execPath: string): Promise<boolean> {
        const command = `g++ -std=c++17 -O2 -Wall "${filePath}" -o "${execPath}"`;
        try {
            await execAsync(command);
            return true;
        } catch (error: any) {
            this._reporter.reportProgress({ command: 'testResult', status: 'Error', message: `Compilation failed for ${path.basename(filePath)}: ${error.stderr}` });
            return false;
        }
    }
}
