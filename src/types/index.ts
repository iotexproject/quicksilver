import { LLMService } from "../llm/llm-service";
import { Tool as AITool } from "ai";

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
  schema: AITool;
}
