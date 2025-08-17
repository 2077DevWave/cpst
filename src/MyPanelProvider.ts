import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IStressTestEngine, ITestResult, ITestReporter, IFileManager } from './core/interfaces';

export class MyPanelProvider implements vscode.WebviewViewProvider, ITestReporter {

    public static readonly viewType = 'stress-test-side-panel-view';
    private _view?: vscode.WebviewView;
    private _currentSolutionFile?: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _history: ITestResult[] = [];
    private _statusBarItem: vscode.StatusBarItem;
    private _extensionUri: vscode.Uri;
    private _resultCounts = {
        'Passed': 0,
        'Mismatch': 0,
        'TLE': 0,
        'MLE': 0,
        'Error': 0
    };

    constructor(
        private readonly _context: vscode.ExtensionContext,
        statusBarItem: vscode.StatusBarItem,
        private readonly _stressTestEngine: IStressTestEngine,
        private readonly _fileManager: IFileManager
    ) {
        this._statusBarItem = statusBarItem;
        this._extensionUri = _context.extensionUri;
    }

    // Implementation of ITestReporter
    public reportProgress(message: any): void {
        this._view?.webview.postMessage(message);
    }

    public reportError(message: string): void {
        vscode.window.showErrorMessage(message);
    }

    public reportHistoryCleared(): void {
        this.clearHistory();
    }

    public reportTestRunning(): void {
        this._statusBarItem.text = "$(sync~spin) Stress Tester: Running";
        this._statusBarItem.show();
        this._view?.webview.postMessage({ command: 'test-running' });
    }
    // End of ITestReporter implementation

    private _updateStatusBar() {
        const { Passed, Mismatch, TLE, MLE } = this._resultCounts;
        const total = Passed + Mismatch + TLE + MLE;
        if (total === 0) {
            this._statusBarItem.text = 'Stress Tester';
            this._statusBarItem.tooltip = 'Run a stress test to see results';
            return;
        }
        
        const statusText = `P:${Passed} W:${Mismatch} T:${TLE} M:${MLE}`;
        this._statusBarItem.text = `$(check) ${statusText}`;
        this._statusBarItem.tooltip = `Stress Test Results:
- Passed: ${Passed}
- Wrong Answer: ${Mismatch}
- Time Limit Exceeded: ${TLE}
- Memory Limit Exceeded: ${MLE}`;
    }

    public async updateViewFor(activeFileUri: vscode.Uri | undefined) {
        if (!this._view) {
            return;
        }

        if (!activeFileUri) {
            this._currentSolutionFile = undefined;
            this._view.webview.postMessage({ command: 'show-initial-state' });
            return;
        }
        
        let solutionUri: vscode.Uri | undefined;
        
        if (activeFileUri.path.endsWith('.genval.cpp') || activeFileUri.path.endsWith('.check.cpp')) {
            solutionUri = this._fileManager.getSolutionFileUri(activeFileUri);
        } 
        else if (activeFileUri.path.endsWith('.cpp')) {
            solutionUri = activeFileUri;
        }

        if (!solutionUri) {
            this._currentSolutionFile = undefined;
            this._view.webview.postMessage({ command: 'show-initial-state' });
            return;
        }

        this._currentSolutionFile = solutionUri;
        const genValFileUri = this._fileManager.getGenValFileUri(solutionUri);
        const checkerFileUri = this._fileManager.getCheckerFileUri(solutionUri);

        try {
            await vscode.workspace.fs.stat(genValFileUri);
            await vscode.workspace.fs.stat(checkerFileUri);
            this._view.webview.postMessage({
                command: 'update-view',
                testFileExists: true,
                solutionFilename: path.basename(this._currentSolutionFile.fsPath)
            });
        } catch {
            this._view.webview.postMessage({
                command: 'update-view',
                testFileExists: false,
                solutionFilename: path.basename(this._currentSolutionFile.fsPath)
            });
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'node_modules')
            ]
        };

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'webview-ready':
                    this.updateViewFor(vscode.window.activeTextEditor?.document.uri);
                    return;
                case 'generate':
                    await this.generateTestFiles();
                    return;
                case 'run':
                    this.runStressTest();
                    return;
            }
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this._updateStatusBar();
    }

    private clearHistory() {
        this._history = [];
        this._resultCounts = {
            'Passed': 0,
            'Mismatch': 0,
            'TLE': 0,
            'MLE': 0,
            'Error': 0
        };
        this._updateStatusBar();
        this._view?.webview.postMessage({ command: 'history-cleared' });
    }
    
    private async generateTestFiles() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('No active C++ solution file selected.');
            return;
        }
        const genValTemplateUri = vscode.Uri.joinPath(this._extensionUri, 'assets', 'generator_validator_template.cpp');
        const checkerTemplateUri = vscode.Uri.joinPath(this._extensionUri, 'assets', 'checker_template.cpp');
        
        const genValFileUri = this._fileManager.getGenValFileUri(this._currentSolutionFile);
        const checkerFileUri = this._fileManager.getCheckerFileUri(this._currentSolutionFile);

        try {
            await this._fileManager.copyFile(genValTemplateUri, genValFileUri, { overwrite: true });
            await this._fileManager.copyFile(checkerTemplateUri, checkerFileUri, { overwrite: true });

            this.updateViewFor(this._currentSolutionFile);
            vscode.window.showInformationMessage('Stress test files created successfully!');

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create test files: ${error}`);
        }
    }

    private async runStressTest() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('Cannot run test: Could not determine the solution file.');
            return;
        }

        this.reportHistoryCleared();
        this.reportTestRunning();

        const solutionPath = this._currentSolutionFile.fsPath;
        const genValPath = this._fileManager.getGenValFileUri(this._currentSolutionFile).fsPath;
        const checkerPath = this._fileManager.getCheckerFileUri(this._currentSolutionFile).fsPath;

        if (!this._fileManager.exists(genValPath) || !this._fileManager.exists(checkerPath)) {
            this._view?.webview.postMessage({ command: 'error', message: 'Stress test files not found. Please generate them first.' });
            return;
        }

        await this._stressTestEngine.runTests(solutionPath, genValPath, checkerPath);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();
        const diff2htmlCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'diff2html', 'bundles', 'css', 'diff2html.min.css'));
        const diff2htmlJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'diff2html', 'bundles', 'js', 'diff2html.min.js'));
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview.html');
        let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

        htmlContent = htmlContent.replace(/%NONCE%/g, nonce);
        htmlContent = htmlContent.replace('%DIFF2HTML_CSS%', diff2htmlCssUri.toString());
        htmlContent = htmlContent.replace('%DIFF2HTML_JS%', diff2htmlJsUri.toString());

        return htmlContent;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
