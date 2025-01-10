import { LLM } from "./llm";
import { Tool } from "./tools/tool";
import { Memory } from "./memory";
import { Workflow } from "./workflow";

export class Agent {
  name: string = "";
  description: string = "";
  tools: (Tool | Agent)[] = [];

  private workflow: Workflow;

  constructor({
    name,
    description,
    fastllm,
    llm,
    tools,
    memory,
  }: {
    name?: string;
    description?: string;
    fastllm?: LLM;
    llm?: LLM;
    tools: (Tool | Agent)[];
    memory?: Memory;
  }) {
    this.name = name || "";
    this.description = description || "";
    this.tools = tools;
    this.workflow = new Workflow({ fastllm, llm, tools, memory });
  }

  async run(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}
