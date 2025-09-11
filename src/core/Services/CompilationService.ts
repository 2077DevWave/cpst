
import { ICompilationService } from '../Interfaces/services';
import { IExecutablePaths } from '../Interfaces/datastructures';
import { ICompiler, ICPSTFolderManager, ICompilationManager } from '../Interfaces/classes';

export class CompilationService implements ICompilationService {
    constructor(
        private readonly _compiler: ICompiler,
        private readonly _cpstFolderManager: ICPSTFolderManager,
        private readonly _compilationManager: ICompilationManager
    ) {}

    public async compile(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | undefined> {
        const paths = this._cpstFolderManager.setup(solutionPath);
        const executables = await this._compilationManager.compile(solutionPath, generatorValidatorPath, checkerPath);
        return executables ?? undefined;
    }
}
