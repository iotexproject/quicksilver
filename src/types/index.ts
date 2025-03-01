import { Tool } from "ai";

export interface PromptContext {
  tools: QSTool[];
  toolOutputs: string[];
  input: string;
}

export interface QSTool {
  name: string;
  description: string;
  output: string;
  twitterAccount?: string;
  schema: { name: string; tool: Tool }[];
}
