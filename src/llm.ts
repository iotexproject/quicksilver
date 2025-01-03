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