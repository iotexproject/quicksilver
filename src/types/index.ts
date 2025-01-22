export interface PromptContext {
  tools: Tool[];
  toolOutputs: string[];
  input: string;
}

export interface Tool {
  name: string;
  description: string;
  twitterAccount?: string;
  execute(input: string): Promise<string>;
}
