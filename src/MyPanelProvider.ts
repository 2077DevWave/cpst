import * as vscode from 'vscode';
import * as path from 'path';

export class MyPanelProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'stress-test-side-panel-view';
    private _view?: vscode.WebviewView;
    private _currentSolutionFile?: vscode.Uri;
    private _disposables: vscode.Disposable[] = []; // To hold our event listeners

    constructor(private readonly _extensionUri: vscode.Uri) {}

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
            localResourceRoots: [this._extensionUri]
        };

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                // --- THIS IS THE NEW, CRUCIAL CASE ---
                case 'webview-ready':
                    // The webview is telling us it's ready.
                    // Now we can safely send the initial state.
                    this.updateViewFor(vscode.window.activeTextEditor?.document.uri);
                    return;

                case 'generate':
                    await this.generateTestFile();
                    return;
                case 'run':
                    this.compileAndRunTest();
                    return;
            }
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
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

    private compileAndRunTest() {
        if (!this._currentSolutionFile) {
            vscode.window.showErrorMessage('Cannot run test: Could not determine the solution file.');
            return;
        }
        const solutionFilePath = this._currentSolutionFile.fsPath;
        const testFileUri = this.getTestFileUri(this._currentSolutionFile);
        const testFilePath = testFileUri.fsPath;
        const testFileDir = path.dirname(testFilePath);
        const testFileBase = path.basename(testFilePath, '.cpp');
        const executablePath = path.join(testFileDir, testFileBase);
        const compileCommand = `g++ -std=c++17 -o "${executablePath}" "${testFilePath}"`;
        const runCommand = `"${executablePath}" "${solutionFilePath}"`;
        const terminal = vscode.window.createTerminal("Stress Tester");
        terminal.show();
        terminal.sendText(`${compileCommand} && ${runCommand}`);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();
        // The HTML does not need to change
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stress Tester</title>
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

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const initialView = document.getElementById('initial-view');
                    const actionsView = document.getElementById('actions-view');
                    const generateView = document.getElementById('generate-view');
                    const runView = document.getElementById('run-view');
                    const fileInfo = document.getElementById('file-info');
                    document.getElementById('generate-button').addEventListener('click', () => {
                        vscode.postMessage({ command: 'generate' });
                    });
                    document.getElementById('run-button').addEventListener('click', () => {
                        vscode.postMessage({ command: 'run' });
                    });
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