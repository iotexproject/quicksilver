import { LLM, ModelAdapter, DummyLLM } from "./llm";

const OPENAI_MODELS = new Set(["gpt-4o", "gpt-4o-mini", "o3-mini", "o1-mini"]);
const DEEPSEEK_MODELS = new Set(["deepseek-chat", "deepseek-reasoner"]);
const ANTHROPIC_MODELS = new Set([
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-7-sonnet-latest",
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
      new ModelAdapter({
        provider: "anthropic",
        model: model || "claude-3-5-haiku-latest",
      }),
    deepseek: (model) =>
      new ModelAdapter({
        provider: "deepseek",
        model: model || "deepseek-chat",
      }),
    openai: (model) =>
      new ModelAdapter({
        provider: "openai",
        model: model || "gpt-4o-mini",
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
