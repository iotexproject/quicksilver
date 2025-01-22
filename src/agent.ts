import type { Tool, PromptContext, IAgent } from "./types";
import { Workflow } from "./workflow";

export class Agent implements IAgent {
  workflow: Workflow;
  name: string;
  description: string;

  constructor(params: {
    name: string;
    description: string;
    tools: Tool[];
    prompt?: (ctx: PromptContext) => string;
  }) {
    const { tools, name, description, prompt } = params;
    this.workflow = new Workflow({ tools, prompt });
    this.name = name;
    this.description = description;
  }

  async execute(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}
