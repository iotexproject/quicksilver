import { ToolSet } from 'ai';

import { LLMService } from './llm/llm-service';
import { logger } from './logger/winston';

export class QueryOrchestrator {
  llmService: LLMService;
  toolSet: ToolSet = {};

  constructor({ toolSet, llmService }: { toolSet: ToolSet; llmService: LLMService }) {
    this.toolSet = toolSet;
    this.llmService = llmService;
  }

  async process(input: string): Promise<string> {
    try {
      return await this.llmService.llm.generate(input, this.toolSet);
    } catch (error) {
      logger.error('Error processing query', error);
      return 'Processing Error, please try again later.';
    }
  }

  async processStream(input: string): Promise<Response> {
    try {
      return await this.llmService.llm.stream(input, this.toolSet);
    } catch (error) {
      logger.error('Error processing query', error);
      return new Response('Processing Error, please try again later.');
    }
  }
}
