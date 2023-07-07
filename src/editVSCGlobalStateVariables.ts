import * as vscode from 'vscode';

function openVariablesWindow(context: vscode.ExtensionContext) {
    // Create a new panel for the separate window
    const panel = vscode.window.createWebviewPanel(
        'variables',
        'Variables',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    // Read the values from extensionContext.globalState and populate the text boxes
    const globalState = context.globalState;
    const variables = [
        "APIKey", 
        "GPTModel"
    ]

    // Load the HTML content into the panel
    panel.webview.html = getVariablesPageContent(variables, globalState);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(message => {
        const { command, key, value } = message;
        switch (command) {
            case 'updateVariable':
                // Update the variable in extensionContext.globalState
                globalState.update(key, value);
                break;
            case 'resetVariable':
                // Reset the text box value to the original value from globalState
                const originalValue = globalState.get(key);
                panel.webview.postMessage({ command: 'resetVariable', key, value: originalValue });
                break;
        }
    });
}

function getVariablesPageContent(variables: Iterable<string>, globalState: vscode.Memento): string {
    // Generate the HTML content for the variables page with the given values
    let htmlContent = `
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
    `;

    for (const variable of variables) {
        const value = globalState.get(variable);

        htmlContent += `
            const ${variable}Input = document.getElementById('${variable}');
            const ${variable}OkButton = document.getElementById('ok${variable}');
            const ${variable}ResetButton = document.getElementById('reset${variable}');
            let original${variable}Value = '${value}';

            // Set the initial value of the text box
            ${variable}Input.value = original${variable}Value;

            // Handle OK button click
            ${variable}OkButton.addEventListener('click', () => {
                const value = ${variable}Input.value;
                vscode.postMessage({
                    command: 'updateVariable',
                    key: '${variable}',
                    value
                });
            });

            // Handle RESET button click
            ${variable}ResetButton.addEventListener('click', () => {
                ${variable}Input.value = original${variable}Value;
            });
        `;
    }

    htmlContent += `
                });
            </script>
        </head>
        <body>
    `;

    for (const variable of variables) {
        htmlContent += `
            <div>
                <label for="${variable}">${variable}:</label>
                <input type="text" id="${variable}" value="" />
                <button id="ok${variable}">OK</button>
                <button id="reset${variable}">RESET</button>
            </div>
        `;
    }

    htmlContent += `
        </body>
        </html>
    `;

    return htmlContent;
}