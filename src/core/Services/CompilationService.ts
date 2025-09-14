
import { ICompilationService } from '../Interfaces/services';
import { IExecutablePaths, ITestPaths } from '../Interfaces/datastructures';
import { ICPSTFolderManager, ICompilationManager } from '../Interfaces/classes';

export class CompilationService implements ICompilationService {
    constructor(
        private readonly _compilationManager: ICompilationManager,
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public async compile(solutionPath: string, generatorValidatorPath: string, checkerPath: string): Promise<IExecutablePaths | undefined> {
        const tempDir = this._cpstFolderManager.getTempDir();
        const executables = await this._compilationManager.compile(tempDir, solutionPath, generatorValidatorPath, checkerPath);
        return executables ?? undefined;
    }
}
