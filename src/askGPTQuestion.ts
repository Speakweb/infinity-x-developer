// Import the necessary modules
import * as vscode from 'vscode';
import { getChatGPTResponse } from './gpt';

async function showInputBox(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
        prompt: "Ask ChatGPT a question",
        placeHolder: 'Type your question here...',
        value: '',
    });
}

function addToGPTQuestionsAnswers(question: string, answer: string, context: vscode.ExtensionContext) {
    const existingData = context.globalState.get("GPTQuestionsAnswers") || "{}";
    const parsedData = JSON.parse(existingData as string);
    if (!parsedData[question]){
        parsedData[question] = answer;
        const updatedData = JSON.stringify(parsedData);
        context.globalState.update("GPTQuestionsAnswers", updatedData);
    }
    vscode.window.showInformationMessage(parsedData);
}

// Function to display all questions and answers in the WebView
function displayAllQuestionsAnswers(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    const existingData = context.globalState.get("GPTQuestionsAnswers") || "{}";
    const qaPairs: { [question: string]: string } = JSON.parse(existingData as string);
    const qaArray = Object.entries(qaPairs).map(([question, answer]) => ({ question, answer }));
    panel.webview.html = getWebviewContent(qaArray);
}

export async function askChatGPTAQuestion(context: vscode.ExtensionContext){
    const question = await showInputBox();
    const answer = await getChatGPTResponse(question as string, context, [], [], []);
    if (question != undefined){
        addToGPTQuestionsAnswers(question, answer as string, context);
    }

    // Display all questions and answers in the WebView after updating the data
    const panel = vscode.window.createWebviewPanel(
        'questionsAnswers',
        'ChatGPT Questions and Answers',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    // Set the HTML content for the WebView
    displayAllQuestionsAnswers(context, panel);

    // Receive messages from the WebView
    panel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'getQuestionsAnswers') {
            displayAllQuestionsAnswers(context, panel);
        }
    });
};

// Function to get the content of the HTML string for the WebView
function getWebviewContent(qaArray: { question: string; answer: string; }[]): string {
    const questionsAnswersHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ChatGPT Questions and Answers</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
            }
            h1 {
                text-align: center;
            }
            ul {
                list-style-type: none;
                padding: 0;
            }
            li {
                border: 1px solid #ccc;
                padding: 10px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <h1>ChatGPT Questions and Answers</h1>
        <ul id="qaList">
            ${qaArray.map(({ question, answer }) => `<li><b>Q:</b> ${question.replace(/\n/g, '<br>')}<br><b>A:</b> ${answer.replace(/\n/g, '<br>')}</li>`).join('')}
        </ul>
        <script>
            vscode = acquireVsCodeApi();

            // Function to display all questions and answers in the WebView
            function displayAllQuestionsAnswers() {
                vscode.postMessage({ command: 'getQuestionsAnswers' });
            }

            // Receive the questions and answers data from the extension context
            window.addEventListener('message', event => {
                const data = event.data;
                if (data.command === 'updateQuestionsAnswers') {
                    const qaList = document.getElementById('qaList');
                    qaList.innerHTML = ''; // Clear the existing list
                    data.qaPairs.forEach(qaPair => {
                        const li = document.createElement('li');
                        li.innerHTML = \`<b>Q:</b> \${qaPair.question.replace(/\\n/g, '<br>')}<br><b>A:</b> \${qaPair.answer.replace(/\\n/g, '<br>')}<br>\`;
                        qaList.appendChild(li);
                    });
                }
            });

            // Request the questions and answers data when the page is ready
            document.addEventListener('DOMContentLoaded', () => {
                displayAllQuestionsAnswers();
            });
        </script>
    </body>
    </html>
`;

    return questionsAnswersHTML;
}


module.exports = {
    askChatGPTAQuestion,
}