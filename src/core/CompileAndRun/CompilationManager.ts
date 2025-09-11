import * as path from 'path';
import { ICompilationManager, ICompiler } from '../Interfaces/classes';
import { IExecutablePaths } from '../Interfaces/datastructures';

export class CompilationManager implements ICompilationManager {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _tempDir: string
    ) {}

    public async compile(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | null> {
        const solutionExec = path.join(this._tempDir, "solution_exec");
        const generatorExec = path.join(this._tempDir, "generator_exec");
        const checkerExec = path.join(this._tempDir, "checker_exec");

        if (!await this._compiler.compile(solutionPath, solutionExec)) {return null;};
        if (!await this._compiler.compile(generatorValidatorPath, generatorExec)) {return null;};
        if (!await this._compiler.compile(checkerPath, checkerExec)) {return null;};

        return { solutionExec, generatorExec, checkerExec };
    }
}
