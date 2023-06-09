import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';
import { TaskPanelKind } from 'vscode';
import { extensions } from 'vscode';
import { workspace, commands } from 'vscode';
import * as fs from 'fs';
import * as DiffMatchPatch from 'diff-match-patch';


function replacePatchLineRange(startLine: number, endLine: number, patch: string): string {
  const lines = patch.split('\n');
  const headerRegex = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;

  let modifiedPatch = '';
  let foundHeader = false;

  for (let line of lines) {
    if (headerRegex.test(line) && !foundHeader) {
      line = line.replace(headerRegex, `@@ -${startLine},${endLine - startLine + 1} +${startLine},${endLine - startLine + 1} @@`);
      foundHeader = true;
    }
    modifiedPatch += line + '\n';
  }
  return modifiedPatch;
}

function getSubstringAtAtSign(input: string): string {
  const atSignIndex = input.indexOf("@");

  if (atSignIndex !== -1) {
    return input.substring(atSignIndex);
  }

  return input;
}

function applyGitDiffToActiveEditor(gitDiff: string, editor: vscode.TextEditor) {
  try {
    const { document } = editor;
    const content = document.getText();
  
    const dmp = new DiffMatchPatch.diff_match_patch();
    const patches = dmp.patch_fromText(getSubstringAtAtSign(gitDiff));
    const [newContent, _] = dmp.patch_apply(patches, content);
    if (_.find(v => !v)) {
      throw new Error(`Could not apply patch ${gitDiff}`);
    }
    // How do I switch to this editor?
    
  
    const thenable = editor.edit((editBuilder) => {
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      editBuilder.replace(range, newContent);
    }).then((success) => {
      if (success) {
        vscode.window.showInformationMessage('Git diff applied successfully');
      } else {
        vscode.window.showErrorMessage('Failed to apply git diff');
      }
    })
    console.log(thenable);
  } catch(e) {
    console.error(e);
  
  }
}

function trimGraves(input: string): string {
  const grave = '`'; // the grave accent character
  let start = 0;
  let end = input.length;

  while (input[start] === grave) {
    start++;
  }

  while (input[end - 1] === grave) {
    end--;
  }

  return input.substring(start, end);
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.modifySelectedText', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText = editor.document.getText(editor.selection);
      const selectedTextLines = [
        editor.selection.start.line, 
        editor.selection.end.line
      ];
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: 'What would you like to change about the following code?'
      };

      vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
        if (userInput) {
          const prompt =  `
          You are a developer who will be provided with a snippet of code in a file, and a description of what the code should do.  Return a unified diff format patch that modifies the code to do what the description says.  
          Assume the code snippet starts at the first line, and dont worry about the rest of the file.
          Return only a valid and parsable unified diff format patch with no extra text.

          Description of changes: "${userInput}"

          Code:

          ${selectedText}`;
          fetchGitPatch(prompt);
          let response = await getChatGPTResponse(prompt, context);
          response = trimGraves(response);
          response = getSubstringAtAtSign(response);
          openPopupTextWindow(
            response,
            selectedText,
            selectedTextLines,
            editor
          );
        }
        //todo turn into function thenc all from botton
      });
    }
  });
  context.subscriptions.push(disposable);
}

function fetchGitPatch(selectedText: string) {
  vscode.window.showInformationMessage(selectedText);
}

function openPopupTextWindow(
  gptReplyPatch: string, 
  selectedText: string, 
  selectedTextLines: number[], 
  editor: vscode.TextEditor
  ) {
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
        <p>${gptReplyPatch}</p>
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

  panel.webview.onDidReceiveMessage(async message => {
    
    let command = message.command;
    if (command === 'applyChanges') {
      // We have to dispoase so that the previous window opens, I think
      // What happens if there are multiple windows open?
      panel.dispose();
      await new Promise(resolve => setTimeout(resolve, 100));
      applyGitDiffToActiveEditor(replacePatchLineRange(selectedTextLines[0], selectedTextLines[1], gptReplyPatch), vscode.window.activeTextEditor as vscode.TextEditor);
    }
    else if (command === 'tryAgain') {
      // call the show input box function agai5n
    }
    else if (command === 'closePanel') {
      panel.dispose();
    }
  });
}

export function deactivate() {}
