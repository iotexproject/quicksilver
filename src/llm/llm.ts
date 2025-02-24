import { generateText, LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";

import { logger } from "../logger/winston";

export interface LLM {
  generate(prompt: string): Promise<string>;
}

export class DummyLLM implements LLM {
  async generate(_: string): Promise<string> {
    const response = `Dummy LLM Response to the user's request.`; // A fixed response
    return JSON.stringify({
      tool: null,
      tool_input: response,
    });
  }
}

export class ModelAdapter implements LLM {
  model: LanguageModel;

  constructor({ provider, model }: { provider: string; model: string }) {
    if (provider === "anthropic") {
      this.model = anthropic(model);
    } else if (provider === "openai") {
      this.model = openai(model);
    } else if (provider === "deepseek") {
      this.model = deepseek(model);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      console.time(`generation with model: ${this.model.modelId}`);
      const { text } = await generateText({
        model: this.model,
        prompt,
      });
      console.timeEnd(`generation with model: ${this.model.modelId}`);
      return text;
    } catch (error) {
      logger.error(
        `Error generating text with model ${this.model.modelId}:`,
        error
      );
      throw new Error("Error generating response");
    }
  }
}
