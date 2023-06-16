import vscode from "vscode";

export function showFetchingNotification(selectedText: string) {
    vscode.window.showInformationMessage(selectedText);
}