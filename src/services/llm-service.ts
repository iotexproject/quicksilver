import { LLM, OpenAILLM, TogetherLLM } from "../llm";

export class LLMService {
  fastllm: LLM;
  llm: LLM;

  constructor() {
    this.shouldUseTogetherForFastLLM()
      ? this.initFastLLMTogether()
      : this.initFastLLMOpenAI();
      
    this.initLLMOpenAI();
  }

  private shouldUseTogetherForFastLLM(): boolean {
    return !!process.env.TOGETHER_API_KEY;
  }

  private initFastLLMTogether(): void {
    this.fastllm = new TogetherLLM({
      model:
        process.env.FAST_LLM_MODEL ||
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    });
  }

  private initFastLLMOpenAI(): void {
    this.fastllm = new OpenAILLM({
      model: process.env.LLM_MODEL || "gpt-3.5-turbo",
    });
  }

  private initLLMOpenAI(): void {
    this.llm = new OpenAILLM({
      model: process.env.LLM_MODEL || "gpt-3.5-turbo",
    });
  }
}
