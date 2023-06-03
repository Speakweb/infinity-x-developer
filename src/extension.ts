import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';
import { TaskPanelKind } from 'vscode';
import { extensions } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.showSelectedText', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText = editor.document.getText(editor.selection);
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: 'Enter your request'
      };

      vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
        if (userInput) {
          const prompt =  `Give me a git patch of the changes needed for the following request and code.  Return only a valid and parsable git patch with no extra text. 
          Request: ${userInput}
          Code: ${selectedText}`;
          showSelectedText(prompt);
          const response = await getChatGPTResponse(prompt);
          openPopupTextWindow(response, selectedText);
        }
        //todo turn into function thenc all from botton
      });
    }
  });
  context.subscriptions.push(disposable);
}

function showSelectedText(selectedText: string) {
  vscode.window.showInformationMessage(selectedText);
}

function openPopupTextWindow(GPTreply: string, selectedText: string) {
  const panel = vscode.window.createWebviewPanel(
      'popupTextWindow',
      'GPT Response',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
  );

  panel.webview.html = `
    <html>
    <body>
      <div>
        <p>${GPTreply}</p>
        <div class="btn-group">
          <br>
          <button onclick="applyChanges()">Apply Changes</button>
          <button onclick="tryAgain()">Try Again With a Different Prompt</button>
          <button onclick="closePanel()">Close</button>
        </div>
      </div>
      
      <script>
        const vscode = acquireVsCodeApi();
        
        function applyChanges() {
          vscode.postMessage({ command: 'applyChanges' });
        }
        
        function tryAgain() {
          vscode.postMessage({ command: 'tryAgain' });
        }
        
        function closePanel() {
          vscode.postMessage({ command: 'closePanel' });
        }
      </script>
    </body>
    </html>
  `;

  panel.webview.onDidReceiveMessage(message => {
    let command = message.command;
    if (command === 'applyChanges') {
      // do stuff
    }
    else if (command === 'tryAgain') {
      // call the show input box function again
    }
    else if (command === 'closePanel') {
      panel.dispose();
    }
  });
}

export function deactivate() {}
