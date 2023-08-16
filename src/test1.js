import {getChatGPTResponse} from './e_modifySelectedText/gpt';
import {editFiles, getModificationsPrompt, Output} from "./e_modifySelectedText/getModifications";
import {askChatGPTAQuestion} from './e_askGPTQuestions/askGPTQuestion';


const selectedText =

(async (userInput) => {
    if (userInput) {
        const prompt = getModificationsPrompt({
            files: [
                {
                    path: './test1.js',
                    content: [
                        {
                            startLine: 0,
                            contents: selectedText
                        }
                    ]
                }
            ],
            request: userInput
        });

        //vscode.window.showInformationMessage(prompt);
        function modifyCode(
            {output}) {
            return output;
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
        await editFiles();
    }
});
await askChatGPTAQuestion(context);

context.subscriptions.push(modifySelectedTextDisposable);
context.subscriptions.push(askChatGPTAQuestionDisposable);

