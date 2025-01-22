import { LLM, OpenAILLM, TogetherLLM } from "../llm";

export class LLMService {
  fastllm: LLM;
  llm: LLM;

  constructor() {
    if (process.env.TOGETHER_API_KEY) {
      this.fastllm = new TogetherLLM({
        model:
          process.env.FAST_LLM_MODEL ||
          "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      });
    } else {
      this.fastllm = new OpenAILLM({
        model: process.env.FAST_LLM_MODEL || "gpt-3.5-turbo",
      });
    }

    this.llm = new OpenAILLM({
      model: process.env.LLM_MODEL || "gpt-3.5-turbo",
    });
  }
}
