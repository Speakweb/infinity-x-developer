import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.showSelectedText', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            async function main() {
                try {
                  const prompt = 'Give me a git diff of changes needed for this code: ' + selectedText;
                  showSelectedText(prompt);
                  const response = await getChatGPTResponse(prompt);
                  //console.log(response);
                  showSelectedText(response);
                } catch (error) {
                  console.error(error);
                }
              }
              main();
        }
    });

    context.subscriptions.push(disposable);
}

function showSelectedText(selectedText: string) {
    vscode.window.showInformationMessage(selectedText);
}

export function deactivate() {}
