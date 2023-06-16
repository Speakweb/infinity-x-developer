import vscode from "vscode";
import {formatDiffText} from "./formatDiffText";
import {applyGitDiffToActiveEditor} from "./applyGitDiffToActiveEditor";
import {replacePatchLineRange} from "./replacePatchLineRange";

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