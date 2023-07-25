import * as vscode from 'vscode';

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

export { getWebviewContent };
