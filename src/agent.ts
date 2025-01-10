import { LLM } from "./llm";
import { Tool } from "./tools/tool";
import { Memory } from "./memory";
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

export class Agent {
  tools: Tool[] = [];
  workflow: Workflow;

  // support tempalte format
  prompt = (ctx: PromptContext) => `
  User Input: ${ctx.input}
  Tool Used: ${ctx.tool.name}
  Tool Input: ${ctx.toolInput}
  Tool Output: ${ctx.toolOutput}

  Generate a human-readable response based on the tool output${ctx.tool.twitterAccount ? ` and mention x handle ${ctx.tool.twitterAccount} in the end.` : ""}`;

  constructor(args: Partial<Agent> = {}) {
    Object.assign(this, args);
    this.tools = this.tools.flatMap((i) => {
      if (i instanceof Agent) {
        return i.tools;
      }
      return i;
    });
    if (!this.workflow) {
      this.workflow = new Workflow({});
    }
    this.workflow.agent = this;
  }

  async execute(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}
