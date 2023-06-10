import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';
import { TaskPanelKind } from 'vscode';
import { extensions } from 'vscode';
import { workspace, commands } from 'vscode';
import * as fs from 'fs';
import * as DiffMatchPatch from 'diff-match-patch';
import { error } from 'console';
import { getVSCodeDownloadUrl } from '@vscode/test-electron/out/util';
import {join, resolve} from 'path'


import AnsiToHtml from 'ansi-to-html';

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

function writeToGConsole(outputString: string, consoleName: string = "Console Output"){
  let console = vscode.window.createOutputChannel(consoleName);
  console.appendLine(outputString);
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
    const newLocal = getSubstringAtAtSign(gitDiff);
    const convertedPatch = newLocal.replace(/\r\n|\r|\n/g, '\n');
    const patches = dmp.patch_fromText(convertedPatch);
    const [newContent, _] = dmp.patch_apply(patches, content);

    const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
    //vscode.window.showInformationMessage("Current Working DIR: " + process.cwd());
    //vscode.window.showInformationMessage("Current folder path: " + folderPath!);
    if (_.find(v => !v)) { 
      if (!fs.existsSync(join(folderPath, "DMPDebug"))){
        fs.mkdirSync(resolve(join(folderPath, "DMPDebug")))
      }
      fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "DMPPatch.txt")), join("Git Diff -\n", gitDiff))
      fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "NewContent.txt")), join("New Contant -\n", newContent))
      fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "OldContent.txt")), join("Old Content -\n", content))
      
      throw new Error(`Could not apply patch ${gitDiff}`);
    }

    const thenable = editor.edit((editBuilder) => {
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      editBuilder.replace(range, newContent);
      console.log(convertedPatch);
    }).then((success) => {
      if (success) {
        vscode.window.showInformationMessage('Git diff applied successfully');
      } else {
        vscode.window.showErrorMessage('Failed to apply git diff');
      }
    });
    console.log(thenable);
  } catch (e) {
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
      const selectedTextLines = [editor.selection.start.line, editor.selection.end.line];
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: 'What would you like to change about the following code?'
      };

      vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
        if (userInput) {
          const prompt = `
          You are a developer who will be provided with a snippet of code in a file, and a description of what the code should do.  Return a unified diff format patch that modifies the code to do what the description says.  
          Assume the code snippet starts at the first line, and don't worry about the rest of the file.
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
        //todo turn into function thenc all from button
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

  const css = `
    <style>
      body {
        background-color: black;
        color: white;
      }
      
      .diff-container {
        font-family: monospace;
        white-space: pre-wrap;
        padding: 10px;
        background-color: #000000;
        color: #ffffff;
      }
      
      .added {
        background-color: #007f00;
        color: #ffffff;
      }
      
      .removed {
        background-color: #7f0000;
        color: #ffffff;
      }
    </style>
  `;

  const diffHtml = formatDiffText(gptReplyPatch);

  panel.webview.html = `
    <html>
    <head>
      ${css}
    </head>
    <body>
      <div class="diff-container">
        <pre>${diffHtml}</pre>
      </div>
      <h3>Selected Code:</h3>
      <pre>${selectedText}</pre>
      <div class="btn-group">
        <br>
        <button onclick="applyChanges()">Apply Changes</button>
        <button onclick="tryAgain()">Try Again With a Different Prompt</button>
        <button onclick="closePanel()">Close</button>
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

  panel.webview.onDidReceiveMessage(async (message) => {
    let command = message.command;
    if (command === 'applyChanges') {
      // We have to dispose so that the previous window opens, I think
      // What happens if there are multiple windows open?
      panel.dispose();
      await new Promise((resolve) => setTimeout(resolve, 100));
      applyGitDiffToActiveEditor(
        replacePatchLineRange(selectedTextLines[0], selectedTextLines[1], gptReplyPatch),
        vscode.window.activeTextEditor as vscode.TextEditor
      );
    } else if (command === 'tryAgain') {
      // call the show input box function again
    } else if (command === 'closePanel') {
      panel.dispose();
    }
  });
}


function formatDiffText(diffText: string): string {
  const ansiToHtml = new AnsiToHtml();
  const lines = diffText.split('\n');
  let formattedDiff = '';

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('+')) {
      formattedDiff += `<span class="added">${ansiToHtml.toHtml(line)}</span>\n`;
    } else if (line.startsWith('-')) {
      formattedDiff += `<span class="removed">${ansiToHtml.toHtml(line)}</span>\n`;
    } else {
      formattedDiff += `${ansiToHtml.toHtml(line)}\n`;
    }
  }

  return formattedDiff;
}

export function deactivate() {}
