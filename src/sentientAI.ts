import { QueryOrchestrator } from "./workflow";
import { LLMService } from "./llm/llm-service";
import { ToolRegistry } from "./tools/registry";
import { QSTool } from "./types";
import { RawDataProvider } from "./raw-data-provider";
import { logger } from "./logger/winston";

export class SentientAI {
  orchestrator: QueryOrchestrator;
  private tools: QSTool[];
  private rawDataProvider: RawDataProvider;

  constructor() {
    if (!process.env.FAST_LLM_MODEL || !process.env.LLM_MODEL) {
      throw new Error("FAST_LLM_MODEL and LLM_MODEL must be set");
    }

    this.tools = ToolRegistry.getEnabledTools();
    logger.info("Enabled tools:", this.tools.map((t) => t.name).join(", "));

    this.orchestrator = new QueryOrchestrator({
      tools: this.tools,
      llmService: new LLMService({
        fastLLMModel: process.env.FAST_LLM_MODEL,
        LLMModel: process.env.LLM_MODEL,
      }),
    });

    this.rawDataProvider = new RawDataProvider();
  }

  async getRawData(
    toolName: string,
    params: Record<string, any>
  ): Promise<any> {
    const tool = this.getTool(toolName);
    return this.rawDataProvider.process(tool, params);
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }

  private getTool(toolName: string): QSTool {
    const tool = ToolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    if (!ToolRegistry.isEnabled(toolName)) {
      throw new Error(`Tool '${toolName}' is not enabled`);
    }
    return tool;
  }
}

export default SentientAI;
