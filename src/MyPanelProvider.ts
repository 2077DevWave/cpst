import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import * as Diff from 'diff';

const execPromise = util.promisify(exec);

interface ITestResult {
    testCase: string;
    userOutput: string;
    correctOutput: string;
    type: 'Mismatch' | 'TLE' | 'Passed' | 'Error' | 'MLE';
    timestamp: string;
}

export class MyPanelProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'stress-test-side-panel-view';
    private _view?: vscode.WebviewView;
    private _currentSolutionFile?: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _history: ITestResult[] = [];
    private _statusBarItem: vscode.StatusBarItem;
    private _resultCounts = {
        'Passed': 0,
        'Mismatch': 0,
        'TLE': 0,
        'MLE': 0,
        'Error': 0
    };

    constructor(
        private readonly _extensionUri: vscode.Uri,
        statusBarItem: vscode.StatusBarItem
    ) {
        this._statusBarItem = statusBarItem;
    }

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
        
        if (activeFileUri.path.endsWith('.test.cpp')) {
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
        const testFileUri = this.getTestFileUri(solutionUri);

        try {
            await vscode.workspace.fs.stat(testFileUri);
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
                    await this.generateTestFile();
                    return;
                case 'run':
                    this.clearHistory();
                    this.compileAndRunTest();
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

    private getTestFileUri(solutionUri: vscode.Uri): vscode.Uri {
        const solutionPath = solutionUri.fsPath;
        const testPath = solutionPath.replace(/\.cpp$/, '.test.cpp');
        return vscode.Uri.file(testPath);
    }

    private getSolutionFileUri(testUri: vscode.Uri): vscode.Uri {
        const testPath = testUri.fsPath;
        const solutionPath = testPath.replace(/\.test\.cpp$/, '.cpp');
        return vscode.Uri.file(solutionPath);
    }
    
    private async generateTestFile() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('No active C++ solution file selected.');
            return;
        }
        const templateUri = vscode.Uri.joinPath(this._extensionUri, 'assets', 'usr_template.cpp');
        const testFileUri = this.getTestFileUri(this._currentSolutionFile);
        try {
            const templateContentBytes = await vscode.workspace.fs.readFile(templateUri);
            let templateContent = Buffer.from(templateContentBytes).toString('utf-8');
            const solutionFilename = path.basename(this._currentSolutionFile.fsPath);
            templateContent = templateContent.replace(/%SOLUTION_FILENAME%/g, solutionFilename);
            await vscode.workspace.fs.writeFile(testFileUri, Buffer.from(templateContent, 'utf8'));
            const document = await vscode.workspace.openTextDocument(testFileUri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create test file: ${error}`);
        }
    }

    private async compileAndRunTest() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('Cannot run test: Could not determine the solution file.');
            return;
        }

        this._statusBarItem.text = "$(sync~spin) Stress Tester: Compiling";
        this._statusBarItem.show();
        this._view?.webview.postMessage({ command: 'test-running' });

        const solutionFilePath = this._currentSolutionFile.fsPath;
        const testFileUri = this.getTestFileUri(this._currentSolutionFile);
        const testFilePath = testFileUri.fsPath;
        const testFileDir = path.dirname(testFilePath);
        const testFileBase = path.basename(testFilePath, '.cpp');
        const executablePath = path.join(testFileDir, testFileBase);
        
        const compileCommand = `g++ -std=c++17 -o "${executablePath}" "${testFilePath}"`;

        try {
            await execPromise(compileCommand);
        } catch (error: any) {
            this._statusBarItem.text = "$(error) Stress Tester: Compile Error";
            const result: ITestResult = {
                type: 'Error',
                testCase: 'Compilation',
                userOutput: error.stderr,
                correctOutput: '',
                timestamp: new Date().toLocaleTimeString()
            };
            this._history.unshift(result);
            this._resultCounts.Error++;
            this._updateStatusBar();
            this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
            return;
        }

        this._statusBarItem.text = "$(sync~spin) Stress Tester: Running Tests";
        const runCommand = `"${executablePath}" "${solutionFilePath}"`;
        const timeout = vscode.workspace.getConfiguration('stress-tester').get('timeout', 2000);
        const memoryLimit = vscode.workspace.getConfiguration('stress-tester').get('memoryLimit', 512);

        try {
            const { stdout, stderr } = await execPromise(runCommand, { 
                timeout,
                maxBuffer: memoryLimit * 1024 * 1024 
            });

            if (stdout.includes("--- FAILED ---")) {
                const result: ITestResult = {
                    ...this.parseFailureOutput(stdout),
                    type: 'Mismatch',
                    timestamp: new Date().toLocaleTimeString()
                };
                this._history.unshift(result);
                this._resultCounts.Mismatch++;
                this._updateStatusBar();
                this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
            } else {
                 const result: ITestResult = {
                    type: 'Passed',
                    testCase: 'All tests passed',
                    userOutput: '',
                    correctOutput: '',
                    timestamp: new Date().toLocaleTimeString()
                };
                this._history.unshift(result);
                this._resultCounts.Passed++;
                this._updateStatusBar();
                this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
            }
        } catch (error: any) {
            if (error.killed) {
                if (error.signal === 'SIGTERM') {
                     const result: ITestResult = {
                        type: 'TLE',
                        testCase: 'Time Limit Exceeded',
                        userOutput: `Process timed out after ${timeout}ms.`,
                        correctOutput: '',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    this._history.unshift(result);
                    this._resultCounts.TLE++;
                    this._updateStatusBar();
                    this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
                } else {
                    const result: ITestResult = {
                        type: 'MLE',
                        testCase: 'Memory Limit Exceeded',
                        userOutput: `Process exceeded memory limit of ${memoryLimit}MB.`,
                        correctOutput: '',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    this._history.unshift(result);
                    this._resultCounts.MLE++;
                    this._updateStatusBar();
                    this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
                }
            } else {
                const result: ITestResult = {
                    type: 'Error',
                    testCase: 'Runtime Error',
                    userOutput: error.stderr || error.message,
                    correctOutput: '',
                    timestamp: new Date().toLocaleTimeString()
                };
                this._history.unshift(result);
                this._resultCounts.Error++;
                this._updateStatusBar();
                this._view?.webview.postMessage({ command: 'test-result', result, history: this._history });
            }
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
        const diff2htmlCss = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'diff2html', 'bundles', 'css', 'diff2html.min.css'));
        const diff2htmlJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'diff2html', 'bundles', 'js', 'diff2html.min.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stress Tester</title>
                <link rel="stylesheet" href="${diff2htmlCss}">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 10px; }
                    .hidden { display: none; }
                    #file-info { margin-bottom: 15px; font-style: italic; color: var(--vscode-descriptionForeground); }
                    button {
                        width: 100%; padding: 8px; border: none;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer; text-align: center;
                    }
                    button:hover { background-color: var(--vscode-button-hoverBackground); }
                    .history-item {
                        padding: 5px;
                        cursor: pointer;
                        border-bottom: 1px solid var(--vscode-editorGroup-border);
                    }
                    .history-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .history-item.selected {
                        background-color: var(--vscode-list-activeSelectionBackground);
                    }
                </style>
            </head>
            <body>
                <div id="initial-view">
                    <p>Please open a <code>.cpp</code> file to begin.</p>
                </div>

                <div id="actions-view" class="hidden">
                    <div id="file-info"></div>
                    <div id="generate-view">
                        <button id="generate-button">Generate Stress Test File</button>
                    </div>
                    <div id="run-view" class="hidden">
                        <button id="run-button">Compile & Run Test</button>
                    </div>
                </div>
                
                <div id="results-view"></div>
                <div id="history-view"></div>

                <script src="${diff2htmlJs}"></script>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const initialView = document.getElementById('initial-view');
                    const actionsView = document.getElementById('actions-view');
                    const generateView = document.getElementById('generate-view');
                    const runView = document.getElementById('run-view');
                    const fileInfo = document.getElementById('file-info');
                    const resultsView = document.getElementById('results-view');
                    const historyView = document.getElementById('history-view');

                    let history = [];

                    document.getElementById('generate-button').addEventListener('click', () => {
                        vscode.postMessage({ command: 'generate' });
                    });
                    document.getElementById('run-button').addEventListener('click', () => {
                        vscode.postMessage({ command: 'run' });
                    });

                    historyView.addEventListener('click', (event) => {
                        const target = event.target.closest('.history-item');
                        if (target) {
                            const index = parseInt(target.dataset.index, 10);
                            displayResult(history[index]);
                            document.querySelectorAll('.history-item').forEach(item => item.classList.remove('selected'));
                            target.classList.add('selected');
                        }
                    });

                    function displayResult(result) {
                        let resultHtml = '<h3>Latest Result</h3>';
                        if (result.type === 'Passed') {
                            resultHtml += '<p style="color: green;">' + result.testCase + '</p>';
                        } else if (result.type === 'TLE') {
                            resultHtml += '<p style="color: orange;">' + result.testCase + '</p>';
                            resultHtml += '<pre>' + result.userOutput + '</pre>';
                        } else if (result.type === 'Error') {
                            resultHtml += '<p style="color: red;">' + result.testCase + '</p>';
                            resultHtml += '<pre>' + result.userOutput + '</pre>';
                        } else {
                            resultHtml += '<p style="color: red;">Failed on test case:</p>';
                            resultHtml += '<pre>' + result.testCase + '</pre>';
                            const diffString = Diff.createPatch('output', result.correctOutput, result.userOutput);
                            const diffHtml = Diff2Html.html(diffString, {
                                drawFileList: false,
                                matching: 'lines',
                                outputFormat: 'side-by-side'
                            });
                            resultHtml += diffHtml;
                        }
                        resultsView.innerHTML = resultHtml;
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'show-initial-state':
                                initialView.classList.remove('hidden');
                                actionsView.classList.add('hidden');
                                break;
                            case 'update-view':
                                initialView.classList.add('hidden');
                                actionsView.classList.remove('hidden');
                                fileInfo.innerHTML = 'Testing: <code>' + message.solutionFilename + '</code>';
                                if (message.testFileExists) {
                                    generateView.classList.add('hidden');
                                    runView.classList.remove('hidden');
                                } else {
                                    generateView.classList.remove('hidden');
                                    runView.classList.add('hidden');
                                }
                                break;
                            case 'test-running':
                                resultsView.innerHTML = '<p>Running tests...</p>';
                                historyView.innerHTML = '';
                                break;
                            case 'test-result':
                                history = message.history;
                                displayResult(message.result);

                                if (history && history.length > 0) {
                                    let historyHtml = '<h3>History</h3>';
                                    history.forEach((item, index) => {
                                        historyHtml += '<div class="history-item" data-index="' + index + '">';
                                        historyHtml += '<span>[' + item.timestamp + '] ' + item.type + '</span>';
                                        historyHtml += '</div>';
                                    });
                                    historyView.innerHTML = historyHtml;
                                    historyView.querySelector('.history-item').classList.add('selected');
                                }
                                break;
                        }
                    });
                    vscode.postMessage({ command: 'webview-ready' });
                </script>
            </body>
            </html>`;
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
