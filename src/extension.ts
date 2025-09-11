
import * as vscode from 'vscode';
import * as path from 'path';
import { MyPanelProvider } from './MyPanelProvider';
import { Compiler } from './core/CompileAndRun/Compiler';
import { Executor } from './core/CompileAndRun/Executor';
import { FileManager } from './core/Managers/FileManager';
import { CPSTFolderManager } from './core/Managers/CPSTFolderManager';
import { TestFileService } from './core/Services/TestFileService';
import { CompilationService } from './core/Services/CompilationService';
import { CompilationManager } from './core/CompileAndRun/CompilationManager';
import { TestRunnerService } from './core/Services/TestRunnerService';
import { ResultService } from './core/Services/ResultService';
import { OrchestrationService } from './core/Services/OrchestrationService';
import { UIService } from './core/Services/UIService';
import { TestReporterProxy } from './core/TestReporterProxy';

export function activate(context: vscode.ExtensionContext) {

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = MyPanelProvider.viewType;
    context.subscriptions.push(statusBarItem);

    // Determine the base directory from the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("Stress Tester extension requires an open workspace to function.");
        return;
    }
    const baseDir = path.join(workspaceFolder.uri.fsPath, '.cpst');

    // --- Dependency Injection Container ---

    // Singletons
    const fileManager = new FileManager();
    const cpstFolderManager = new CPSTFolderManager(fileManager, baseDir);
    const executor = new Executor();
    const testReporterProxy = new TestReporterProxy();

    const compiler = new Compiler(testReporterProxy);
    const compilationManager = new CompilationManager(compiler, baseDir);

    // Core Services
    const testFileService = new TestFileService(fileManager, context.extensionUri);
    const compilationService = new CompilationService(compiler, cpstFolderManager, compilationManager);
    const testRunnerService = new TestRunnerService(executor, fileManager, cpstFolderManager);
    const resultService = new ResultService(fileManager, cpstFolderManager);
    
    const orchestrationService = new OrchestrationService(
        compilationService,
        testRunnerService,
        resultService,
        cpstFolderManager,
        testReporterProxy
    );

    const uiService = new UIService(
        fileManager,
        testFileService,
        orchestrationService,
        testReporterProxy
    );

    // UI Layer
    const provider = new MyPanelProvider(context, statusBarItem, uiService);
    testReporterProxy.proxy = provider;

    // --- End of Dependency Injection ---

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
