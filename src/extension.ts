import * as vscode from 'vscode';
import { MyPanelProvider } from './MyPanelProvider';

export function activate(context: vscode.ExtensionContext) {

    const provider = new MyPanelProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MyPanelProvider.viewType, provider)
    );

    // This listener is the key to "live" updates.
    // We are now ensuring it fires for EVERY change, including closing all editors.
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            // The '?' sends 'undefined' if there's no active editor
            provider.updateViewFor(editor?.document.uri);
        })
    );
    
    // Also handle the initial state when the extension is first activated.
    provider.updateViewFor(vscode.window.activeTextEditor?.document.uri);
}

export function deactivate() {}