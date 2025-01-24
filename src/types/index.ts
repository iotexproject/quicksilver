import { LLMService } from "../services/llm-service";

export interface PromptContext {
  tools: Tool[];
  toolOutputs: string[];
  input: string;
}

export interface Tool {
  name: string;
  description: string;
  output: string;
  twitterAccount?: string;
  execute(input: string, llmService: LLMService): Promise<string>;
}
