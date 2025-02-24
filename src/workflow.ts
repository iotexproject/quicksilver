import { ToolSet } from "ai";

import { logger } from "./logger/winston";
import { LLMService } from "./llm/llm-service";
import { Tool } from "./types";

export class QueryOrchestrator {
  llmService: LLMService;
  tools: Tool[] = [];

  constructor({
    tools,
    llmService,
  }: {
    tools: Tool[];
    llmService: LLMService;
  }) {
    this.tools = tools;
    this.llmService = llmService;
  }

  // TODO: input should include user query and context
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

  buildToolSet(): ToolSet {
    const toolSet: ToolSet = {};
    this.tools.forEach((tool) => {
      toolSet[tool.name] = tool.schema;
    });
    return toolSet;
  }
}
