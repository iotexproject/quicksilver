import { Tool } from "./tools/tool";
import { Workflow } from "./workflow";

interface PromptContext {
  tool: Tool;
  toolOutput: string;
  toolInput: string;
  input: string;
}

export interface Agent {
  name: string;
  description: string;
  tools: Tool[];
  prompt: (ctx: PromptContext) => string;
}

export class Agent implements Agent {
  workflow: Workflow;
  tools: Tool[] = [];

  constructor(args: Partial<Agent> = {}) {
    Object.assign(this, args);
    this.tools = this.tools.flatMap((i) => {
      if (i instanceof Agent) {
        return i.tools;
      }
      return i;
    });
    if (!this.workflow) {
      this.workflow = new Workflow({ agent: this });
    }
  }

  async execute(input: string): Promise<string> {
    return this.workflow.execute(input);
  }

  prompt = (ctx: PromptContext) => `
User Input: ${ctx.input}
Tool Used: ${ctx.tool.name}
Tool Input: ${ctx.toolInput}
Tool Output: ${ctx.toolOutput}

Generate a human-readable response based on the tool output${ctx.tool.twitterAccount ? ` and mention x handle ${ctx.tool.twitterAccount} in the end.` : ""}`;
}
