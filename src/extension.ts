import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';
import { TaskPanelKind } from 'vscode';
import { extensions } from 'vscode';
import { workspace, commands } from 'vscode';
import * as fs from 'fs';
import * as DiffMatchPatch from 'diff-match-patch';
import { error } from 'console';
import { getVSCodeDownloadUrl } from '@vscode/test-electron/out/util';
import { join, resolve } from 'path'


import AnsiToHtml from 'ansi-to-html';

function replacePatchLineRange(startLine: number, endLine: number, patch: string): string {
  const lines = patch.split('\n');
  const headerRegex = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;

  let originalLength = 0;
  let newLength = 0;
  let modifiedPatch = '';
  let foundHeader = false;

  for (let line of lines) {
    if (headerRegex.test(line) && !foundHeader) {
      let match = line.match(headerRegex);
      originalLength = match ? parseInt(match[2]) : 0;
      newLength = match ? parseInt(match[4]) : 0;

      line = line.replace(headerRegex, `@@ -${startLine},${originalLength} +${startLine},${newLength} @@`);
      foundHeader = true;
    }
    modifiedPatch += line + '\n';
  }

  return modifiedPatch;
}

function writeToGConsole(outputString: string, consoleName: string = "Console Output") {
  let console = vscode.window.createOutputChannel(consoleName);
  console.appendLine(outputString);
}

function TrimBeforeAtSign(input: string): string {
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
    const extractedUDFFromGitDiff = TrimBeforeAtSign(gitDiff);
    const fixLineEndings = extractedUDFFromGitDiff//.replace(/\r\n|\r|\n/g, '\n');
    const patches = dmp.patch_fromText(fixLineEndings);
    const [newContent, _] = dmp.patch_apply(patches, content);

    const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
    //vscode.window.showInformationMessage("Current Working DIR: " + process.cwd());
    //vscode.window.showInformationMessage("Current folder path: " + folderPath!);

    if (!fs.existsSync(join(folderPath, "DMPDebug"))) {
      fs.mkdirSync(resolve(join(folderPath, "DMPDebug")))
    }
    fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "DMPPatch.txt")), join("Patch -\n", fixLineEndings))
    fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "NewContent.txt")), join("New Contant -\n", newContent))
    fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "OldContent.txt")), join("Old Content -\n", content))

    const couldNotApplyPatch = _.some(v => !v);
    if (couldNotApplyPatch) {
      throw new Error(`Could not apply patch ${fixLineEndings}`);
    }

    const thenable = editor.edit((editBuilder) => {
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      editBuilder.replace(range, newContent);
      console.log(fixLineEndings);
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
  let disposable = vscode.commands.registerCommand('extension.modifySelectedText', async () => {
    const editor = vscode.window.activeTextEditor;
    
    if (editor) {
      let newSelections = [];
      for (let selection of editor.selections) {
          let startLine = selection.start.line;
          let endLine = selection.end.line;

          let newStart = new vscode.Position(startLine, 0);
          let newEnd = new vscode.Position(endLine, editor.document.lineAt(endLine).text.length);
          newSelections.push(new vscode.Selection(newStart, newEnd));
      }

      editor.selections = newSelections;
      // Show the user what exactly will be sent to the language model, or maybe I shouldn't.  It's not relevant ot them
      await new Promise(resolve => setTimeout(resolve, 100));
      const selectedText = editor.document.getText(editor.selection);
      // Bruh, zero based indexing in the api, but 1 based in the editor
      // Wait, are the line selections in the unified diff format 1 based or 0 based?
      const selectedTextLines = [editor.selection.start.line + 1, editor.selection.end.line + 1];
      const inputBoxOptions: vscode.InputBoxOptions = {
        prompt: 'What would you like to change about the following code?'
      };

      vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
        if (userInput) {
          const prompt = `
You are a developer who will be provided with a snippet of code in a file, and a description of what the code should do. 
Apply a unified diff format patch that modifies the code to do what the description says. 
Assume the code snippet starts at the first line of the file, and that the last line in the snippet is the last line in the file.
Make sure the "from" hunk line ranges accurately reflect the input code, and the "to" hunk line ranges accurately reflect the output code.  
Also you keep forgetting the whitespace I gave you in the original code, and the the resulting "from" section of the hunk can't be applied.  Stop fucking doing that as well.
Finally, so some fucking reason the patches you generate don't have the whitespace intendation of the original code, so I can't apply them.  Stop fucking doing that.
You keep replacing an empty line with code, and the not writing that you deleted the empty line.  Stop fucking doing that. 
If you replace an empty line with a non-empty line, that counts as a deleted and then inserted line.
If you REPLACE a line, then the "to" hunk does NOT get bigger, it has the same amount of lines.  Make sure the count in the "to" hunk actually reflects the amount of fucking lines in the patch.
Please, I'm begging you.  Before you give me this patch, make sure that the "from" hunk is present in the input code, has the correct indendation, has the correct count.
Then make sure the "to" hunk has the correct amount of fucking lines that will be present once the modifications apply.  CHECK THE LINE COUNTS OF THE PATCH BEFORE YOU GIVE THEM TO ME.  EMPTY LINES ARE LINES WHICH MUST BE ADDED AND REMOVED, NOT SIMPLY REPLACED.
The indentatino of the "from" hunk better fucking match the indentation of the original code, retard

When you call applyPatch, make sure the patch paramter is a fully valid, parsable unified diff format patch.

Description of changes: "${userInput}"

The code is the last part of this prompt and starts on the next line.  All whitespace in all text below this is literal code and must be kept for the patch you generate to be applied.
${selectedText}`;
          
          showFetchingNotification(prompt);
          function applyPatch({patch, inputText, outputText, originalCodeIndent}: {patch: string, inputText: string, outputText: string, originalCodeIndent: string}) {
            console.log(inputText)
            console.log(outputText)
            console.log(originalCodeIndent)
            return patch;
          }
          
          let response = await getChatGPTResponse<string>(
            prompt,
            context,
            [],
            [
              {
                "name": "applyPatch",
                "description": "Apply The Unified Diff Format Patch to the code",
                "parameters": {
                  "type": "object",
                  "properties": {
                    "patch": { 
                      "type": "string", 
                      "description": "The patch being applied" 
                    },
                    "inputText": {
                      "type": "string",
                      "description": "The exact code that the patch is being applied to"
                    },
                    "outputText": {
                      "type": "string",
                      "description": "The exact code that the patch should produce"
                    },
                    "originalCodeIndent": {
                      "type": "string",
                      "description": "The exact indentation of the original code"
                    }
                  },
                  "required": ["patch"],
                },
              }
            ],
            [applyPatch]
          );
          let santizedResponse = trimGraves(response);
          santizedResponse = TrimBeforeAtSign(santizedResponse);
          // I'll assume it responded wrong
          /*try {
            const reply = await getChatGPTResponse(
              `In the hunk you said it only says there are 2 lines, originally, but there are 3.  There is an empty line`, 
              context, 
              [
                {
                  content: santizedResponse, 
                  role: 'assistant'
                }
              ],
              [],
              []
            );
            console.log(reply);
          } catch(e) {
            console.log(e);
          }*/
          
          openPopupTextWindow(
            santizedResponse,
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

function showFetchingNotification(selectedText: string) {
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

export function deactivate() { }
