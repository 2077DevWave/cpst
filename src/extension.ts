
import * as vscode from 'vscode';
import { MyPanelProvider } from './MyPanelProvider';
import { StressTestEngine } from './core/StressTestEngine';
import { Compiler } from './core/Compiler';
import { Executor } from './core/Executor';
import { FileManager } from './core/FileManager';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = MyPanelProvider.viewType;
    context.subscriptions.push(statusBarItem);

    const fileManager = new FileManager();

    // Determine the base directory from the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Stress Tester extension requires an open workspace to function.");
        return;
    }
    const baseDir = path.join(workspaceFolder.uri.fsPath, '.cpst');
    
    // Create provider without the engine first
    const provider = new MyPanelProvider(context, statusBarItem, fileManager);

    // Create engine, passing provider as the reporter
    const stressTestEngine = new StressTestEngine(
        new Compiler(provider),
        new Executor(),
        fileManager,
        provider,
        baseDir
    );

    // Now, inject the engine into the provider
    provider.setStressTestEngine(stressTestEngine);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MyPanelProvider.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                provider.updateViewFor(editor.document.uri);
            }
        })
    );
    
    if (vscode.window.activeTextEditor) {
        provider.updateViewFor(vscode.window.activeTextEditor.document.uri);
    }
}

export function deactivate() {}
