import { RAGApplication, RAGApplicationBuilder } from "@llm-tools/embedjs";
import { LibSqlDb } from "@llm-tools/embedjs-libsql";
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
  rag: RAGApplication | null = null;

  constructor(args: Partial<FastLLM> = {}) {
    Object.assign(this, args);
    if (!this.rag) {
      new RAGApplicationBuilder()
        .setModel(
          new OpenAi({
            model: "gpt-3.5-turbo",
            maxTokens: 200,
            temperature: 0
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
  rag: RAGApplication | null = null;

  constructor(args: Partial<FastLLM> = {}) {
    Object.assign(this, args);
    if (!this.rag) {
      new RAGApplicationBuilder()
        .setModel(new OpenAi({
          model: "gpt-3.5-turbo", maxTokens: 200,
          temperature: 0,
        }))
        .setEmbeddingModel(
          new OpenAiEmbeddings({
            model: "text-embedding-3-small",
          }),
        )
        .setVectorDatabase(new LibSqlDb({ path: "./data.db" }))
        .build()
        .then((model) => (this.rag = model));
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.rag?.query(prompt);
      console.log(result);
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error("Together API Error:", error.message);
      return `Together API Error: ${error.message}`;
    }
  }
}
