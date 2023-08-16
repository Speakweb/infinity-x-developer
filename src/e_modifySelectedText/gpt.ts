import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionFunctions } from 'openai';
import {workspace, ExtensionContext} from 'vscode';
import * as vscode from 'vscode';
import {VSCGlobalStateEditor} from '../e_editVSCGlobalStateVariables/editVSCGlobalStateVariables';

// let GPTModel = 'gpt-4-0613'
// let openAIKey = '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';

interface ResponseCache {
  [prompt: string]: string;
}

const cacheFilePath = 'responseCache.json';

export async function getChatGPTResponse<T>(
  prompt: string, 
  context: ExtensionContext, 
  messages: ChatCompletionRequestMessage[],
  functions: ChatCompletionFunctions[],
  callbacks: ((params: any) => any)[]): Promise<T> {
  const cacheKey = `responseCache.${prompt + JSON.stringify(functions) + JSON.stringify(messages)}`;
  const cachedResponse = context.globalState.get<T>(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  let response = '';

  const sendUserMessage = async (input: string) => {
    const requestMessage: ChatCompletionRequestMessage = {
      role: 'user',
      content: input,
    };
    const GPTAPIValue = context.globalState.get('GPTAPIKey') as string || process.env.GPTAPIKey;
    if (!GPTAPIValue){
      vscode.window.showInformationMessage("'GPTAPIKey' not found within process.env or VSC's globalState.")
      VSCGlobalStateEditor(context);
      return;
    }
    const configuration = new Configuration({
      apiKey: GPTAPIValue,
    });
    const openai = new OpenAIApi(configuration);

    try {
      let t = process.env.GPTModel;
      const GPTModelValue = context.globalState.get('GPTModel') as string || process.env.GPTModel || "gpt-4-0613";
      //const GPTModelValue = 'gpt-3.5-turbo';
      const completion = await openai.createChatCompletion({
        model: GPTModelValue,
        messages: messages.concat(requestMessage),
        functions: functions.length ? functions : undefined,
        function_call: functions.length ? 'auto' : undefined
      });

      const responseMessage = completion.data.choices[0].message;
      let responseContent = responseMessage?.content;
      if (responseMessage?.function_call) { 
        const function_name = responseMessage?.function_call?.name;
        const foundFunction = callbacks.find(callback => callback.name === function_name);
        if (!foundFunction) {
          throw new Error(`ChatGPT function ${function_name} not found`);
        }
        responseContent = foundFunction(
            JSON.parse(responseMessage?.function_call?.arguments || "{}")
        );
        console.log(responseContent)
      }
  
      
      if (responseMessage && responseContent) {
        response = responseContent,
        messages.push({
          role: responseMessage.role,
          function_call: responseMessage.function_call,
          content: responseMessage.content
          // What is the content in the case of a function call?
        });
      }
    } catch (error) {
      throw error;
    }
  };

  await sendUserMessage(prompt);

  // Cache the response
  await context.globalState.update(cacheKey, response);

  return response as unknown as T;
}