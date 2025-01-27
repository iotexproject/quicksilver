import Anthropic from "@anthropic-ai/sdk";

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
      const response = await this.anthropic.messages.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        max_tokens: 1000,
        temperature: 0,
      });
      // @ts-ignore
      return response.content[0]?.text || "No content in response";
    } catch (error: any) {
      console.error("Anthropic API Error:", error.message);
      return `Anthropic API Error: ${error.message}`;
    }
  }
}
