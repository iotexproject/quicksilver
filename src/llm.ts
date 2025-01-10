import OpenAI from "openai";
import { RAGApplication, RAGApplicationBuilder, SIMPLE_MODELS } from '@llm-tools/embedjs';
import { LibSqlDb } from '@llm-tools/embedjs-libsql';

import { OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
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


export class EmbedLLM implements LLM {
  model: RAGApplication | null = null

  constructor(args: Partial<EmbedLLM> = {}) {
    Object.assign(this, args)
    if (!this.model) {
      new RAGApplicationBuilder()
        .setModel(SIMPLE_MODELS["OPENAI_GPT3.5_TURBO"])
        .setEmbeddingModel(new OpenAiEmbeddings())
        .setVectorDatabase(new LibSqlDb({ path: './data.db' }))
        .build().then(model => this.model = model)
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.model?.query(prompt);
      console.log(result)
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error("Together API Error:", error.message);
      return `Together API Error: ${error.message}`;
    }
  }
}

