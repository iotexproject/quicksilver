import { QueryOrchestrator } from "./workflow";
import { LLMService } from "./llm/llm-service";
import { ToolRegistry } from "./tools/registry";

export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    if (!process.env.FAST_LLM_MODEL || !process.env.LLM_MODEL) {
      throw new Error("FAST_LLM_MODEL and LLM_MODEL must be set");
    }

    const enabledTools = ToolRegistry.getEnabledTools();
    console.log("Enabled tools:", enabledTools.map((t) => t.name).join(", "));

    this.orchestrator = new QueryOrchestrator({
      tools: enabledTools,
      llmService: new LLMService({
        fastLLMModel: process.env.FAST_LLM_MODEL,
        LLMModel: process.env.LLM_MODEL,
      }),
    });
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
