import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.showSelectedText', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            showSelectedText(selectedText);
        }
    });

    context.subscriptions.push(disposable);
}

function showSelectedText(selectedText: string) {
    vscode.window.showInformationMessage(selectedText);
}

export function deactivate() {}
