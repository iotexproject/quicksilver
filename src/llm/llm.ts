import { generateText, LanguageModel, ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";

import { logger } from "../logger/winston";

export interface LLM {
  generate(prompt: string, tools?: ToolSet): Promise<string>;
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

  async generate(prompt: string, tools?: ToolSet): Promise<string> {
    try {
      console.time(`generation with model: ${this.model.modelId}`);
      const response = await generateText({
        model: this.model,
        prompt,
        tools,
        maxSteps: 10,
      });
      console.timeEnd(`generation with model: ${this.model.modelId}`);
      const allToolCalls = response.steps.flatMap(
        (step: any) => step.toolCalls
      );
      console.log("allToolCalls: ", allToolCalls);
      console.log("usage: ", response.usage);

      return response.text;
    } catch (error) {
      logger.error(
        `Error generating text with model ${this.model.modelId}:`,
        error
      );
      throw new Error("Error generating response");
    }
  }
}
