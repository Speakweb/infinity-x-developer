import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai';
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

export async function getChatGPTResponse(prompt: string, context: ExtensionContext): Promise<string> {
  const cacheKey = `responseCache.${prompt}`;
  const cachedResponse = context.globalState.get<string>(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  let response = '';
  const messages: ChatCompletionRequestMessage[] = [];

  const sendUserMessage = async (input: string) => {
    const requestMessage: ChatCompletionRequestMessage = {
      role: 'user',
      content: input,
    };
    messages.push(requestMessage);

    try {
      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: messages,
      });

      const responseMessage = completion.data.choices[0].message;
      if (responseMessage) {
        response += responseMessage.content;
        messages.push({
          role: responseMessage.role,
          content: responseMessage.content,
        });
      }
    } catch (error) {
      throw error;
    }
  };

  await sendUserMessage(prompt);

  // Cache the response
  await context.globalState.update(cacheKey, response);

  return response;
}