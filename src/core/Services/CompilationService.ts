
import { ICompilationService } from '../Interfaces/services';
import { IExecutablePaths } from '../Interfaces/datastructures';
import { ICompiler, ICPSTFolderManager } from '../Interfaces/classes';
import { CompilationManager } from '../CompileAndRun/CompilationManager';
import { CPSTFolderManager } from '../Managers/CPSTFolderManager';

export class CompilationService implements ICompilationService {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public async compile(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | undefined> {
        const paths = this._cpstFolderManager.setup(solutionPath);
        const compilationManager = new CompilationManager(this._compiler, paths.tempDir);
        const executables = await compilationManager.compile(solutionPath, generatorValidatorPath, checkerPath);
        return executables ?? undefined;
    }
}
