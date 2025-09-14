
import * as vscode from 'vscode';
import { ITestFileService } from '../Interfaces/services';
import { IFileManager } from '../Interfaces/classes';

export class TestFileService implements ITestFileService {
    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _extensionUri: vscode.Uri
    ) {}

    public async createTestFiles(solutionFile: vscode.Uri): Promise<void> {
        const genValTemplateUri = vscode.Uri.joinPath(this._extensionUri, "assets", "generator_validator_template.cpp");
        const checkerTemplateUri = vscode.Uri.joinPath(this._extensionUri, "assets", "checker_template.cpp");

        const genValFileUri = this._fileManager.getGenValFileUri(solutionFile);
        const checkerFileUri = this._fileManager.getCheckerFileUri(solutionFile);

        try {
            await this._fileManager.copyFile(genValTemplateUri, genValFileUri, { overwrite: true });
            await this._fileManager.copyFile(checkerTemplateUri, checkerFileUri, { overwrite: true });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create test files: ${error}`);
            throw error;
        }
    }

    public async testFilesExist(solutionFile: vscode.Uri): Promise<boolean> {
        const genValFileUri = this._fileManager.getGenValFileUri(solutionFile);
        const checkerFileUri = this._fileManager.getCheckerFileUri(solutionFile);

        return this._fileManager.exists(genValFileUri.fsPath) && this._fileManager.exists(checkerFileUri.fsPath);
    }
}
