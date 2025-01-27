import { LLM, AnthropicLLM, OpenAILLM, DummyLLM } from "../llm";

export class LLMService {
  fastLLMProvider: string;
  llmProvider: string;
  fastllm: LLM;
  llm: LLM;

  constructor(params: { fastLLMProvider: string; llmProvider: string }) {
    this.fastLLMProvider = params.fastLLMProvider;
    this.llmProvider = params.llmProvider;

    this.fastllm = this.initLLM({
      provider: this.fastLLMProvider,
      model: process.env.FAST_LLM_MODEL,
    });

    this.llm = this.initLLM({
      provider: this.llmProvider,
      model: process.env.LLM_MODEL,
    });
  }

  private initLLM(params: { provider: string; model?: string }): LLM {
    if (params.provider === "anthropic") {
      return new AnthropicLLM({
        model: params.model || "claude-3-5-haiku-latest",
      });
    } else if (params.provider === "deepseek") {
      return new OpenAILLM({
        model: params.model || "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseURL: "https://api.deepseek.com",
      });
    } else if (params.provider === "openai") {
      return new OpenAILLM({
        model: params.model || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY || "",
      });
    } else {
      return new DummyLLM();
    }
  }
}
