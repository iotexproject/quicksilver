import { Tool as AITool } from "ai";

import { LLMService } from "../llm/llm-service";

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
  schema: { name: string; tool: AITool }[];
}
