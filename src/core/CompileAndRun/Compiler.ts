
import * as path from 'path';
import { ICompiler, ITestReporter, ICommandExecutor } from '../Interfaces/classes';

export class Compiler implements ICompiler {
    constructor(
        private readonly _reporter: ITestReporter,
        private readonly _commandExecutor: ICommandExecutor
    ) { }

    public async compile(filePath: string, execPath: string): Promise<boolean> {
        const command = `g++ -std=c++17 -O2 -Wall "${filePath}" -o "${execPath}"`;
        try {
            await this._commandExecutor.execute(command);
            return true;
        } catch (error: any) {
            this._reporter.reportProgress({ command: 'testResult', status: 'Error', message: `Compilation failed for ${path.basename(filePath)}: ${error.stderr}` });
            return false;
        }
    }
}
