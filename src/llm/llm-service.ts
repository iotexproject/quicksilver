import { LLM, AnthropicLLM, OpenAILLM, DummyLLM } from "./llm";

const OPENAI_MODELS = new Set(["gpt-4o", "gpt-4o-mini", "o3-mini", "o1-mini"]);
const DEEPSEEK_MODELS = new Set(["deepseek-chat", "deepseek-reasoner"]);
const ANTHROPIC_MODELS = new Set([
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
]);

export class LLMService {
  fastllm: LLM;
  llm: LLM;

  constructor(params: { fastLLMModel?: string; LLMModel?: string }) {
    this.fastllm = this.initLLM({
      model: params.fastLLMModel,
    });

    this.llm = this.initLLM({
      model: params.LLMModel,
    });
  }

  providerMap: Record<string, (model?: string) => LLM> = {
    anthropic: (model) =>
      new AnthropicLLM({
        model: model || "claude-3-5-haiku-latest",
      }),
    deepseek: (model) =>
      new OpenAILLM({
        model: model || "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseURL: "https://api.deepseek.com",
      }),
    openai: (model) =>
      new OpenAILLM({
        model: model || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY || "",
      }),
  };

  private getProviderFromModel(model?: string): string {
    if (!model) return ""; // default provider
    if (OPENAI_MODELS.has(model)) return "openai";
    if (DEEPSEEK_MODELS.has(model)) return "deepseek";
    if (ANTHROPIC_MODELS.has(model)) return "anthropic";
    return "";
  }

  private initLLM(params: { model?: string }): LLM {
    if (!params.model) return new DummyLLM();
    const provider = this.getProviderFromModel(params.model);
    const factory = this.providerMap[provider];
    return factory?.(params.model) ?? new DummyLLM();
  }
}
