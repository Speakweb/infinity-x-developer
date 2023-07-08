import * as vscode from 'vscode';

export function VSCGlobalStateEditor(context: vscode.ExtensionContext) {
    // Create a new panel for the separate window
    const panel = vscode.window.createWebviewPanel(
        'vscglobalstateeditor',
        'VSC Global State Editor',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    // Read the values from extensionContext.globalState and populate the text boxes
    const globalState = context.globalState;
    const keys = [
        "GPTAPIKey", 
        "GPTModel"
    ];

    vscode.window.showInformationMessage(globalState.get(keys[0]) || "empty")

    // Load the HTML content into the panel
    panel.webview.html = getVariablesPageContent(keys, context);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(message => {
        const { command, key, value } = message;
        vscode.window.showInformationMessage(JSON.stringify({ command, key, value }))

        switch (command) {
            case 'updateVariable':
                // Update the variable in extensionContext.globalState
                globalState.update(key, value);
                break;
        }
    });
}

function getVariablesPageContent(variables: Iterable<string>, context: vscode.ExtensionContext): string {
    // Generate the HTML content for the variables page with the given values
    return `
    <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Variables</title>
    <style>
        /* CSS styles for the UI */
    </style>
    <script>
        // JavaScript code for handling button clicks and updating variables
        document.addEventListener('DOMContentLoaded', () => {
            const vscode = acquireVsCodeApi();
            const variables = JSON.parse('${JSON.stringify(Array.from(variables))}');
            // const debugDiv = document.getElementById('debug')
            // debugDiv.innerHTML = "Loaded"

            variables.forEach(variable => {
                const variableInput = document.getElementById(variable);
                const okButton = document.getElementById('ok' + variable);
                let originalValue = variableInput.value; 

                // Handle OK button click
                okButton.addEventListener('click', () => {
                    // debugDiv.innerHTML = "started click handler"
                    // try {
                        const ret = vscode.postMessage({
                            command: 'updateVariable',
                            key: variable,
                            value: variableInput.value,
                        });
                        // debugDiv.innerHTML = JSON.stringify(ret)
                    // } catch(e) {
                        // debugDiv.innerHTML = e.message;
                    // }
                });
            });
        });
    </script>
</head>
<body>
    ${Array.from(variables)
        .map(variable => `
            <div>
                <label for="${variable}">${variable}:</label>
                <input type="text" id="${variable}" value="${context.globalState.get(variable) || variable}" />
                <button id="ok${variable}">OK</button>
            </div>
        `)
        .join('')}
        <div id="debug"></div>
</body>
</html>

    `;
}

// Invoke the openVariablesWindow function where appropriate

module.exports = {
    VSCGlobalStateEditor,
}