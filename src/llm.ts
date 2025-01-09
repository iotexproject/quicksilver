import OpenAI from "openai";
import Together from "together-ai";

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

export class OpenAILLM implements LLM {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4") { // Default to gpt-4
    if (!apiKey) {
      throw new Error("OpenAI API key is required.");
    }
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0,
      });

      // Correctly access the message content
      const message = completion.choices?.[0]?.message;
      if (message) { // Check if message exists
        return message.content?.trim() || "No content in message"; // Check if message.content exists
      } else {
        console.error("Unexpected OpenAI response format:", completion); // Log the full response
        return "No message in response";
      }

    } catch (error: any) {
      if (error.response) {
        console.error("OpenAI API Error:", error.response.status, error.response.data);
      } else {
        console.error("OpenAI Error:", error.message);
      }
      return `OpenAI Error: ${error.message}`;
    }
  }
}

export class TogetherLLM implements LLM {
  private together: Together;
  private model: string;

  constructor(model: string = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-128K") {
    this.together = new Together();
    this.model = model;
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.together.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        max_tokens: null,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ["<|eot_id|>", "<|eom_id|>"],
        stream: true,
      });

      let result = "";
      for await (const token of response) {
        const content = token.choices[0]?.delta?.content;
        if (content) {
          result += content;
        }
      }
      return result.trim() || "No content in response";

    } catch (error: any) {
      console.error("Together API Error:", error.message);
      return `Together API Error: ${error.message}`;
    }
  }
}

