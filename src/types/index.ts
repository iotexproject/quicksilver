export interface PromptContext {
  tool: Tool;
  toolOutput: string;
  toolInput: string;
  input: string;
}

export interface Tool {
  name: string;
  description: string;
  twitterAccount?: string;
  execute(input: string): Promise<string>;
}

export interface ActionResult {
  tool?: Tool;
  output: string;
}

export interface IAgent {
  name: string;
  description: string;
  execute(input: string): Promise<string>;
}
