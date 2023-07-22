import * as vscode from 'vscode';
import {getChatGPTResponse} from './gpt';
import {editFiles, getModificationsPrompt, Output} from "./getModifications";
import {showFetchingNotification} from "./showFetchingNotification";
import {VSCGlobalStateEditor} from './editVSCGlobalStateVariables';
import {askChatGPTAQuestion } from './askGPTQuestion';
export function activate(context: vscode.ExtensionContext) {
    try{
        let modifySelectedTextDisposable = vscode.commands.registerCommand('extension.modifySelectedText', async () => {
        try{
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
                        editFiles(response as unknown as Output);
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
        }catch(error){
            vscode.window.showInformationMessage((error as any).message);
        }
        });
        let VSCGlobalStateEditorDisposable = vscode.commands.registerCommand('extension.VSCGlobalStateEditor', async () => {
            VSCGlobalStateEditor(context);
        });
        let askChatGPTAQuestionDisposable = vscode.commands.registerCommand("extension.askChatGPTAQuestion", async () => {
            askChatGPTAQuestion(context);
        });

        context.subscriptions.push(modifySelectedTextDisposable);
        context.subscriptions.push(VSCGlobalStateEditorDisposable);
        context.subscriptions.push(askChatGPTAQuestionDisposable);

    }catch (error){
        vscode.window.showInformationMessage((error as any).message);
    }  
} 


export function deactivate() {
}
