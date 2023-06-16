import * as vscode from 'vscode';
import {getChatGPTResponse} from './gpt';
import {TaskPanelKind} from 'vscode';
import {extensions} from 'vscode';
import {workspace, commands} from 'vscode';
import * as fs from 'fs';
import * as DiffMatchPatch from 'diff-match-patch';
import {error} from 'console';
import {getVSCodeDownloadUrl} from '@vscode/test-electron/out/util';
import {join, resolve} from 'path'


import AnsiToHtml from 'ansi-to-html';
import {getModificationsPrompt, Output} from "./getModifications";

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
        const {document} = editor;
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
            const selectedText = editor.document.getText(editor.selection).split('\n');

            // Bruh, zero based indexing in the api, but 1 based in the editor
            // Wait, are the line selections in the unified diff format 1 based or 0 based?
            const selectedTextLines = [editor.selection.start.line + 1, editor.selection.end.line + 1];
            const inputBoxOptions: vscode.InputBoxOptions = {
                prompt: 'What would you like to change about the following code?'
            };

            vscode.window.showInputBox(inputBoxOptions).then(async (userInput) => {
                if (userInput) {
                    const prompt = getModificationsPrompt({
                        files: [
                            {
                                path: editor.document.fileName,
                                content: [
                                    {
                                        startLine: editor.selection.start.line + 1,
                                        contents: selectedText
                                    }
                                ]
                            }
                        ],
                        request: userInput
                    });

                    showFetchingNotification(prompt);

                    function modifyCode(
                        {
                            output
                        }: {
                            output: Output
                        }) {
                        return output
                    }

                    let response = await getChatGPTResponse<string>(
                        prompt,
                        context,
                        [],
                        [
                            {
                                name: 'modifyCode',
                                description: 'Apply the changes to those ranges in those files',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        output: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    path: {
                                                        type: 'string',
                                                        description: "the path of the file being modified"
                                                    },
                                                    content: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                startLine: {
                                                                    type: 'number',
                                                                    description: "the line number of the start of the range being modified"
                                                                },
                                                                contents: {
                                                                    type: "array",
                                                                    items: {
                                                                        type: "string",
                                                                        description: "the contents of the line being modified"
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    required: ['output']
                                },
                            }
                        ],
                        [modifyCode]
                    );
/*
                    let santizedResponse = trimGraves(response);
                    santizedResponse = TrimBeforeAtSign(santizedResponse);
*/
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

                    /**
                     * Let's just try straight modification
                     */
                    /*
                                        openPopupTextWindow(
                                            santizedResponse,
                                            selectedText,
                                            selectedTextLines,
                                            editor
                                        );
                    */
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

export function deactivate() {
}
