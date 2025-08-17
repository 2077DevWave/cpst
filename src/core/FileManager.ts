
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IFileManager } from './interfaces';

export class FileManager implements IFileManager {
    public createDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    public writeFile(filePath: string, content: string): void {
        fs.writeFileSync(filePath, content);
    }

    public readFile(filePath: string): string {
        return fs.readFileSync(filePath, 'utf-8');
    }

    public exists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    public cleanup(dirs: string[]): void {
        dirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    }

    public getSolutionFileUri(testUri: vscode.Uri): vscode.Uri {
        const testPath = testUri.fsPath;
        const solutionPath = testPath.replace(/\.(genval|check)\.cpp$/, '.cpp');
        return vscode.Uri.file(solutionPath);
    }

    public getGenValFileUri(solutionUri: vscode.Uri): vscode.Uri {
        const solutionPath = solutionUri.fsPath;
        const testPath = solutionPath.replace(/\.cpp$/, '.genval.cpp');
        return vscode.Uri.file(testPath);
    }

    public getCheckerFileUri(solutionUri: vscode.Uri): vscode.Uri {
        const solutionPath = solutionUri.fsPath;
        const testPath = solutionPath.replace(/\.cpp$/, '.check.cpp');
        return vscode.Uri.file(testPath);
    }

    public async copyFile(source: vscode.Uri, destination: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        await vscode.workspace.fs.copy(source, destination, options);
    }
}
