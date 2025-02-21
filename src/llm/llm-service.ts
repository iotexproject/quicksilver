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
      key: process.env.FAST_LLM_API_KEY,
    });

    this.llm = this.initLLM({
      model: params.LLMModel,
      key: process.env.LLM_API_KEY,
    });
  }

  providerMap: Record<string, (model?: string, key?: string) => LLM> = {
    anthropic: (model) =>
      new AnthropicLLM({
        model: model || "claude-3-5-haiku-latest",
      }),
    deepseek: (model, key) =>
      new OpenAILLM({
        model: model || "deepseek-chat",
        apiKey: key || "",
        baseURL: "https://api.deepseek.com",
      }),
    openai: (model, key) =>
      new OpenAILLM({
        model: model || "gpt-4o-mini",
        apiKey: key || "",
      }),
  };

  private getProviderFromModel(model?: string): string {
    if (!model) return "openai"; // default provider
    if (OPENAI_MODELS.has(model)) return "openai";
    if (DEEPSEEK_MODELS.has(model)) return "deepseek";
    if (ANTHROPIC_MODELS.has(model)) return "anthropic";
    return "openai";
  }

  private initLLM(params: { model?: string; key?: string }): LLM {
    const provider = this.getProviderFromModel(params.model);
    const factory = this.providerMap[provider];
    return factory?.(params.model, params.key) ?? new DummyLLM();
  }
}
