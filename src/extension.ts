import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.showSelectedText', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText = editor.document.getText(editor.selection);
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: 'Enter your request',
        //value: selectedText,
      };

      vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
        if (userInput) {
          const prompt =  'Give me a git diff of the changes needed for the following request and code: ' + userInput + '. Here is the existing code: \n\n' + selectedText;
          showSelectedText(prompt);
          const response = await getChatGPTResponse(prompt);
          showSelectedText(response);
        }
      });
    }
  });

  context.subscriptions.push(disposable);
}

function showSelectedText(selectedText: string) {
  vscode.window.showInformationMessage(selectedText);
}

export function deactivate() {}
