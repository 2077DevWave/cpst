import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ITestReporter } from "./core/Interfaces/classes";
import { ITestResult } from "./core/Interfaces/datastructures";
import { IUIService } from "./core/Interfaces/services";

export class MyPanelProvider
  implements vscode.WebviewViewProvider, ITestReporter
{
  public static readonly viewType = "stress-test-side-panel-view";
  private _view?: vscode.WebviewView;
  private _disposables: vscode.Disposable[] = [];
  private _history: ITestResult[] = [];
  private _statusBarItem: vscode.StatusBarItem;
  private _extensionUri: vscode.Uri;
  private _resultCounts = {
    Passed: 0,
    Mismatch: 0,
    TLE: 0,
    MLE: 0,
    Error: 0,
  };

  constructor(
    private readonly _context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem,
    private readonly _uiService: IUIService
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
    this._view?.webview.postMessage({ command: "test-running" });
  }
  // End of ITestReporter implementation

  private _updateStatusBar() {
    const { Passed, Mismatch, TLE, MLE } = this._resultCounts;
    const total = Passed + Mismatch + TLE + MLE;
    if (total === 0) {
      this._statusBarItem.text = "Stress Tester";
      this._statusBarItem.tooltip = "Run a stress test to see results";
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

  public updateViewFor(activeFileUri: vscode.Uri | undefined) {
    this._uiService.updateActiveFile(activeFileUri);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, "node_modules"),
      ],
    };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "webview-ready":
          this.updateViewFor(vscode.window.activeTextEditor?.document.uri);
          return;
        case "generate":
          await this._uiService.generateTestFiles();
          return;
        case "run":
          this._uiService.runStressTest(message.numTests);
          return;
      }
    });

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this._updateStatusBar();
  }

  private clearHistory() {
    this._history = [];
    this._resultCounts = {
      Passed: 0,
      Mismatch: 0,
      TLE: 0,
      MLE: 0,
      Error: 0,
    };
    this._updateStatusBar();
    this._view?.webview.postMessage({ command: "history-cleared" });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    const diff2htmlCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "diff2html",
        "bundles",
        "css",
        "diff2html.min.css"
      )
    );
    const diff2htmlJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "diff2html",
        "bundles",
        "js",
        "diff2html.min.js"
      )
    );
    const htmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "out",
      "webview.html"
    );
    let htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");

    htmlContent = htmlContent.replace(/%NONCE%/g, nonce);
    htmlContent = htmlContent.replace(
      "%DIFF2HTML_CSS%",
      diff2htmlCssUri.toString()
    );
    htmlContent = htmlContent.replace(
      "%DIFF2HTML_JS%",
      diff2htmlJsUri.toString()
    );

    return htmlContent;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
