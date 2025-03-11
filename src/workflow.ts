import { ToolSet } from "ai";

import { logger } from "./logger/winston";
import { LLMService } from "./llm/llm-service";
import { QSTool } from "./types";

export class QueryOrchestrator {
  llmService: LLMService;
  tools: QSTool[] = [];

  constructor({
    tools,
    llmService,
  }: {
    tools: QSTool[];
    llmService: LLMService;
  }) {
    this.tools = tools;
    this.llmService = llmService;
  }

  async process(input: string): Promise<string> {
    try {
      const toolSet = this.buildToolSet();
      const response = await this.llmService.llm.generate(input, toolSet);
      return response;
    } catch (error) {
      logger.error("Error processing query", error);
      return "Processing Error, please try again later.";
    }
  }

  async processStream(input: string): Promise<any> {
    try {
      const toolSet = this.buildToolSet();
      const response = await this.llmService.llm.stream(input, toolSet);
      return response;
    } catch (error) {
      logger.error("Error processing query", error);
      return "Processing Error, please try again later.";
    }
  }

  buildToolSet(): ToolSet {
    const toolSet: ToolSet = {};
    this.tools.forEach((tool) => {
      tool.schema.forEach((schema) => {
        toolSet[schema.name] = schema.tool;
      });
    });
    return toolSet;
  }
}
