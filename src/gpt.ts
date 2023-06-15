import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionFunctions } from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import {workspace, ExtensionContext} from 'vscode';
//import chalk from 'chalk';

dotenv.config();
const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

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

    try {
      const completion = await openai.createChatCompletion({
        model: 'gpt-4-0613',
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
      }
  
      
      if (responseMessage && responseContent) {
        response += responseContent,
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