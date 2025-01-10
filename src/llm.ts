import OpenAI from "openai";
import { RAGApplication, RAGApplicationBuilder } from "@llm-tools/embedjs";
import { LibSqlDb, LibSqlStore } from "@llm-tools/embedjs-libsql";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
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

  constructor(
    apiKey: string = process.env.OPENAI_API_KEY!,
    model: string = "gpt-4",
  ) {
    // Default to gpt-4
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
      if (message) {
        // Check if message exists
        return message.content?.trim() || "No content in message"; // Check if message.content exists
      } else {
        console.error("Unexpected OpenAI response format:", completion); // Log the full response
        return "No message in response";
      }
    } catch (error: any) {
      if (error.response) {
        console.error(
          "OpenAI API Error:",
          error.response.status,
          error.response.data,
        );
      } else {
        console.error("OpenAI Error:", error.message);
      }
      return `OpenAI Error: ${error.message}`;
    }
  }
}

export class OpenAIRAG implements LLM {
  rag: RAGApplication | null = null;

  constructor(args: Partial<FastLLM> = {}) {
    Object.assign(this, args);
    if (!this.rag) {
      new RAGApplicationBuilder()
        .setModel(
          new OpenAi({
            model: "gpt-3.5-turbo",
          }),
        )
        .setEmbeddingModel(
          new OpenAiEmbeddings({
            model: "text-embedding-3-small",
          }),
        )
        .setVectorDatabase(new LibSqlDb({ path: "./data.db" }))
        .build()
        .then((rag) => (this.rag = rag));
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.rag?.query(prompt);
      console.log(result);
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error(" API Error:", error.message);
      return ` API Error: ${error.message}`;
    }
  }
}

export class FastLLM implements LLM {
  model: RAGApplication | null = null;

  constructor(args: Partial<FastLLM> = {}) {
    Object.assign(this, args);
    if (!this.model) {
      new RAGApplicationBuilder()
        .setModel(new OpenAi({ model: "gpt-3.5-turbo" }))
        .setEmbeddingModel(
          new OpenAiEmbeddings({
            model: "text-embedding-3-small",
          }),
        )
        .setVectorDatabase(new LibSqlDb({ path: "./data.db" }))
        .build()
        .then((model) => (this.model = model));
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.model?.query(prompt);
      console.log(result);
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error("Together API Error:", error.message);
      return `Together API Error: ${error.message}`;
    }
  }
}
