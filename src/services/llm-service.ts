import { LLM, AnthropicLLM } from "../llm";

export class LLMService {
  fastllm: LLM;
  llm: LLM;

  constructor() {
    if (!process.env.TOGETHER_API_KEY) {
      throw new Error("TOGETHER_API_KEY is required");
    }
    this.initFastLLM();
    this.initLLM();
  }

  private initFastLLM(): void {
    this.fastllm = new AnthropicLLM({
      model:
        process.env.FAST_LLM_MODEL ||
        "claude-3-5-haiku-latest",
    });
  }

  private initLLM(): void {
    this.llm = new AnthropicLLM({
      model: process.env.LLM_MODEL || "claude-3-5-sonnet-latest",
    });
  }
}
