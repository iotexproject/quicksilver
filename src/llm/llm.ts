import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import {
  generateText,
  streamText,
  LanguageModel,
  ToolSet,
  createDataStreamResponse,
  smoothStream,
  StepResult,
} from 'ai';

import { logger } from '../logger/winston';

export const TOOL_CALL_LIMIT = process.env.TOOL_CALL_LIMIT ? parseInt(process.env.TOOL_CALL_LIMIT) : 20;

export interface LLM {
  generate(prompt: string, tools?: ToolSet): Promise<string>;
  stream(prompt: string, tools?: ToolSet): Promise<Response>;
}

export class DummyLLM implements LLM {
  async generate(_: string): Promise<string> {
    const response = `Dummy LLM Response to the user's request.`; // A fixed response
    return JSON.stringify({
      tool: null,
      tool_input: response,
    });
  }

  async stream(_: string): Promise<Response> {
    return new Response("Dummy LLM Response to the user's request.");
  }
}

export class ModelAdapter implements LLM {
  model: LanguageModel;

  constructor({ provider, model }: { provider: string; model: string }) {
    if (provider === 'anthropic') {
      this.model = anthropic(model);
    } else if (provider === 'openai') {
      this.model = openai(model);
    } else if (provider === 'deepseek') {
      this.model = deepseek(model);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async generate(prompt: string, tools?: ToolSet): Promise<string> {
    try {
      console.time(`generation with model: ${this.model.modelId}`);
      const response = await generateText({
        model: this.model,
        system:
          (process.env.SYSTEM_PROMPT ||
            "You're a helpful assistant that can answer questions and help with tasks. You are also able to use tools to get information.") +
          `\nCurrent date and time: ${new Date().toISOString()}`,
        prompt,
        tools,
        maxSteps: TOOL_CALL_LIMIT,
        experimental_continueSteps: true,
        onStepFinish(step: StepResult<ToolSet>) {
          ModelAdapter.logStep(step);
        },
      });
      console.timeEnd(`generation with model: ${this.model.modelId}`);
      return response.text;
    } catch (error) {
      logger.error(`Error generating text with model ${this.model.modelId}:`, error);
      throw new Error('Error generating response');
    }
  }

  async stream(prompt: string, tools?: ToolSet): Promise<Response> {
    console.log('stream', prompt);
    return createDataStreamResponse({
      execute: dataStream => {
        const result = streamText({
          model: this.model,
          system:
            (process.env.SYSTEM_PROMPT ||
              "You're a helpful assistant that can answer questions and help with tasks. You are also able to use tools to get information.") +
            `\nCurrent date and time: ${new Date().toISOString()}`,
          prompt,
          tools,
          maxSteps: TOOL_CALL_LIMIT,
          experimental_continueSteps: true,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          onStepFinish(step: StepResult<ToolSet>) {
            ModelAdapter.logStep(step);
          },
        });
        result.consumeStream();
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
    });
  }

  static logStep(step: StepResult<ToolSet>): void {
    console.log('step: ', step.text);
    console.log('toolCalls: ', step.toolCalls);
    console.log('toolResults: ', step.toolResults);
    console.log('finishReason: ', step.finishReason);
    console.log('usage: ', step.usage);
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
