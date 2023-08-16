import vscode from 'vscode';
import {getChatGPTResponse} from './e_modifySelectedText/gpt';
import {editFiles, getModificationsPrompt, Output} from "./e_modifySelectedText/getModifications";
import {VSCGlobalStateEditor} from './e_editVSCGlobalStateVariables/editVSCGlobalStateVariables';
import {askChatGPTAQuestion} from './e_askGPTQuestions/askGPTQuestion';
import {encode} from 'gpt-tokenizer';
import quotes from './LKY.json';

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

export function activate(context: vscode.ExtensionContext) {
    try {
        let modifySelectedTextDisposable = vscode.commands.registerCommand('extension.modifySelectedText', async () => {
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
                // Show the user what exactly will be sent to the language model, or maybe I shouldn't.  It's not relevant to them
                await new Promise(resolve => setTimeout(resolve, 100));
                const selectedText = editor.document.getText(editor.selection).split('\n');
                const a = editor.document.getText(editor.selection)
                const tokens = encode(editor.document.getText(editor.selection));
                vscode.window.showInformationMessage('Your code takes up ' + tokens.length + ' tokens.');

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

                        vscode.window.showInformationMessage(prompt);

                        function modifyCode(
                            {
                                output
                            }: {
                                output: Output
                            }) {
                            return output
                        }
                        //quote insert
                        vscode.window.showInformationMessage('Waiting for a language model response....................................................."' + quotes.quotes[getRandomInt(quotes.quotes.length)] + '" -Lee Kuan Yew');
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
                                                        insertions: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    startLine: {
                                                                        type: 'number',
                                                                        description: "the line number of the start of the range being modified"
                                                                    },
                                                                    content: {
                                                                        type: 'array',
                                                                        items: {
                                                                            type: 'string',
                                                                            description: "the contents of the line being modified"
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        deletions: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'number'
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        required: ['output']
                                    }
                                }
                            ],
                            [modifyCode]
                        );
                        await editFiles(response as unknown as Output);
                    }
                });
            }
        });
        let VSCGlobalStateEditorDisposable = vscode.commands.registerCommand('extension.VSCGlobalStateEditor', async () => {
            VSCGlobalStateEditor(context);
        });
        let askChatGPTAQuestionDisposable = vscode.commands.registerCommand("extension.askChatGPTAQuestion", async () => {
            //webstorm wants an await here, ignore it
            askChatGPTAQuestion(context);
        });

        context.subscriptions.push(modifySelectedTextDisposable);
        context.subscriptions.push(VSCGlobalStateEditorDisposable);
        context.subscriptions.push(askChatGPTAQuestionDisposable);

    } catch (error) {
        vscode.window.showInformationMessage((error as any).message);
    }
}


export function deactivate() {
}