import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai';
import * as dotenv from 'dotenv';
//import chalk from 'chalk';

dotenv.config();
const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

export async function getChatGPTResponse(prompt: string): Promise<string> {
  const messages: ChatCompletionRequestMessage[] = [];
  let response = '';

  const sendUserMessage = async (input: string) => {
    const requestMessage: ChatCompletionRequestMessage = {
      role: 'user',
      content: input,
    };
    messages.push(requestMessage);

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
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
  };

  await sendUserMessage(prompt);

  return response;
}
