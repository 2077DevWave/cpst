import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
import * as Diff from 'diff';
import { StressTestEngine } from './StressTestEngine';

const execPromise = util.promisify(exec);

interface ITestResult {
    testCase: string;
    userOutput: string;
    correctOutput: string;
    type: 'Mismatch' | 'TLE' | 'Passed' | 'Error' | 'MLE' | 'WA' | 'OK' | 'Running' | 'RUNTIME_ERROR';
    timestamp: string;
    input?: string;
    output?: string;
    time?: number;
    memory?: number;
    message?: string;
}


export class MyPanelProvider implements vscode.WebviewViewProvider {

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
        statusBarItem: vscode.StatusBarItem
    ) {
        this._statusBarItem = statusBarItem;
        this._extensionUri = _context.extensionUri;
    }

    private _updateStatusBar() {
        const { Passed, Mismatch, TLE, MLE } = this._resultCounts;
        const total = Passed + Mismatch + TLE + MLE;
        if (total === 0) {
            this._statusBarItem.text = 'Stress Tester';
            this._statusBarItem.tooltip = 'Run a stress test to see results';
            return;
        }
        
        const statusText = `P:\${Passed} W:\${Mismatch} T:\${TLE} M:\${MLE}`;
        this._statusBarItem.text = `$(check) \${statusText}`;
        this._statusBarItem.tooltip = `Stress Test Results:
- Passed: \${Passed}
- Wrong Answer: \${Mismatch}
- Time Limit Exceeded: \${TLE}
- Memory Limit Exceeded: \${MLE}`;
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
            solutionUri = this.getSolutionFileUri(activeFileUri);
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
        const genValFileUri = this.getGenValFileUri(solutionUri);
        const checkerFileUri = this.getCheckerFileUri(solutionUri);

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

    private getSolutionFileUri(testUri: vscode.Uri): vscode.Uri {
        const testPath = testUri.fsPath;
        const solutionPath = testPath.replace(/\.(genval|check)\.cpp$/, '.cpp');
        return vscode.Uri.file(solutionPath);
    }

    private getGenValFileUri(solutionUri: vscode.Uri): vscode.Uri {
        const solutionPath = solutionUri.fsPath;
        const testPath = solutionPath.replace(/\.cpp$/, '.genval.cpp');
        return vscode.Uri.file(testPath);
    }

    private getCheckerFileUri(solutionUri: vscode.Uri): vscode.Uri {
        const solutionPath = solutionUri.fsPath;
        const testPath = solutionPath.replace(/\.cpp$/, '.check.cpp');
        return vscode.Uri.file(testPath);
    }
    
    private async generateTestFiles() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('No active C++ solution file selected.');
            return;
        }
        const genValTemplateUri = vscode.Uri.joinPath(this._extensionUri, 'assets', 'generator_validator_template.cpp');
        const checkerTemplateUri = vscode.Uri.joinPath(this._extensionUri, 'assets', 'checker_template.cpp');
        
        const genValFileUri = this.getGenValFileUri(this._currentSolutionFile);
        const checkerFileUri = this.getCheckerFileUri(this._currentSolutionFile);

        try {
            await vscode.workspace.fs.copy(genValTemplateUri, genValFileUri, { overwrite: true });
            await vscode.workspace.fs.copy(checkerTemplateUri, checkerFileUri, { overwrite: true });

            this.updateViewFor(this._currentSolutionFile);
            vscode.window.showInformationMessage('Stress test files created successfully!');

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create test files: \${error}`);
        }
    }

    private async runStressTest() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('Cannot run test: Could not determine the solution file.');
            return;
        }

        this.clearHistory();
        this._statusBarItem.text = "$(sync~spin) Stress Tester: Running";
        this._statusBarItem.show();
        this._view?.webview.postMessage({ command: 'test-running' });

        const solutionPath = this._currentSolutionFile.fsPath;
        const dir = path.dirname(solutionPath);
        
        const genValPath = this.getGenValFileUri(this._currentSolutionFile).fsPath;
        const checkerPath = this.getCheckerFileUri(this._currentSolutionFile).fsPath;

        if (!fs.existsSync(genValPath) || !fs.existsSync(checkerPath)) {
            this._view?.webview.postMessage({ command: 'error', message: 'Stress test files not found. Please generate them first.' });
            return;
        }

        if (this._view) {
            const engine = new StressTestEngine(this._context, this._view, dir);
            engine.runTests(solutionPath, genValPath, checkerPath);
        }
    }

    private parseFailureOutput(stdout: string): Omit<ITestResult, 'type' | 'timestamp'> {
        const inputMatch = stdout.match(/Input:\s*([\s\S]*?)\s*--- YOUR OUTPUT ---/);
        const userOutputMatch = stdout.match(/--- YOUR OUTPUT ---\s*([\s\S]*?)\s*--- CORRECT OUTPUT ---/);
        const correctOutputMatch = stdout.match(/--- CORRECT OUTPUT ---\s*([\s\S]*)/);

        return {
            testCase: inputMatch ? inputMatch[1].trim() : 'Could not parse input.',
            userOutput: userOutputMatch ? userOutputMatch[1].trim() : 'Could not parse user output.',
            correctOutput: correctOutputMatch ? correctOutputMatch[1].trim() : 'Could not parse correct output.'
        };
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