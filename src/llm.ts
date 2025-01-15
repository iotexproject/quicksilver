import { RAGApplication, RAGApplicationBuilder } from "@llm-tools/embedjs";
import { LibSqlDb } from "@llm-tools/embedjs-libsql";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
import { Together } from "together-ai";
import { CompletionCreateParamsBase } from "together-ai/resources/chat/completions";
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
  model: string = "gpt-3.5-turbo";
  rag: RAGApplication | null = null;

  constructor(args: Partial<OpenAILLM> = {}) {
    Object.assign(this, args);
    if (!this.rag) {
      new RAGApplicationBuilder()
        .setModel(
          new OpenAi({
            model: this.model,
            maxTokens: 200,
            temperature: 0,
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
      // console.log(result);
      return result?.content.trim() || "No content in response";
    } catch (error: any) {
      console.error(" API Error:", error.message);
      return ` API Error: ${error.message}`;
    }
  }
}

export class TogetherLLM implements LLM {
  private together: Together = new Together();
  model = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-128K";

  constructor(args: Partial<TogetherLLM> = {}) {
    Object.assign(this, args);
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.together.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        max_tokens: 2000,
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
