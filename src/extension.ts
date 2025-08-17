import * as vscode from 'vscode';
import { MyPanelProvider } from './MyPanelProvider';

export function activate(context: vscode.ExtensionContext) {

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = MyPanelProvider.viewType;
    context.subscriptions.push(statusBarItem);

    const provider = new MyPanelProvider(context, statusBarItem);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MyPanelProvider.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            provider.updateViewFor(editor?.document.uri);
        })
    );
    
    provider.updateViewFor(vscode.window.activeTextEditor?.document.uri);
}

export function deactivate() {}
