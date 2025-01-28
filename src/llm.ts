import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface LLM {
  generate(prompt: string): Promise<string>;
}

export class DummyLLM implements LLM {
  async generate(prompt: string): Promise<string> {
    const response = `Dummy LLM Response to the user's request.`; // A fixed response
    return JSON.stringify({
      tool: null,
      tool_input: response,
    });
  }
}

export class AnthropicLLM implements LLM {
  private anthropic: Anthropic;
  model: string;

  constructor(params: { model: string }) {
    this.model = params.model;
    const anthropic = new Anthropic();
    this.anthropic = anthropic;
  }

  async generate(prompt: string): Promise<string> {
    try {
      console.time("called with model: " + this.model);
      const response = await this.anthropic.messages.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        max_tokens: 1000,
        temperature: 0,
      });
      console.timeEnd("called with model: " + this.model);
      // @ts-ignore property text does exist
      return response.content[0]?.text || "No content in response";
    } catch (error: any) {
      console.error("Anthropic API Error:", error.message);
      return `Anthropic API Error: ${error.message}`;
    }
  }
}

export class OpenAILLM implements LLM {
  private openai: OpenAI;
  model: string;

  constructor(params: { model: string; apiKey: string; baseURL?: string }) {
    this.model = params.model;
    const openai = new OpenAI({
      apiKey: params.apiKey,
      baseURL: params.baseURL || "https://api.openai.com/v1",
    });
    this.openai = openai;
  }

  async generate(prompt: string): Promise<string> {
    console.time("called with model: " + this.model);
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    });
    console.timeEnd("called with model: " + this.model);
    return response.choices[0]?.message.content || "No content in response";
  }
}
