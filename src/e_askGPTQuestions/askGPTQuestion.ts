import * as vscode from 'vscode';
import { getChatGPTResponse } from '../e_modifySelectedText/gpt';
import { getWebviewContent } from './getWebviewContent'; // Import the getWebviewContent function from the new file

async function showInputBox(): Promise<string | undefined> {
    return vscode.window.showInputBox({
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

function displayAllQuestionsAnswers(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    const existingData = context.globalState.get("GPTQuestionsAnswers") || "{}";
    const qaPairs: { [question: string]: string } = JSON.parse(existingData as string);
    const qaArray = Object.entries(qaPairs).map(([question, answer]) => ({ question, answer }));
    panel.webview.html = getWebviewContent(qaArray);
}

export async function askChatGPTAQuestion(context: Mocha.SuiteFunction){
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

module.exports = {
    askChatGPTAQuestion,
};
