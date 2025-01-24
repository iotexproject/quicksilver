import { finalResponseTemplate, toolSelectionTemplate } from "./templates";
import { LLMService } from "./services/llm-service";
import { Tool } from "./types";
import { extractContentFromTags } from "./utils/parsers";

export class QueryOrchestrator {
  llmService: LLMService;
  tools: Tool[] = [];

  constructor({ tools }: { tools: Tool[] }) {
    this.tools = tools;
    this.llmService = new LLMService();
  }

  // TODO: input should include user query and context
  async process(input: string): Promise<string> {
    try {
      const selectedTools = await this.selectTools(input);
      if (!selectedTools.length) {
        return this.proceedWithoutTools(input);
      }
      return this.proceedWithTools(input, selectedTools);
    } catch (error) {
      return "Processing Error: " + error;
    }
  }

  async selectTools(input: string): Promise<Tool[]> {
    const availableTools = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      output: tool.output,
    }));

    if (!availableTools.length) {
      return [];
    }

    const toolSelectionPrompt = toolSelectionTemplate(input, availableTools);
    const llmResponse =
      await this.llmService.fastllm.generate(toolSelectionPrompt);

    console.log("llmResponse", llmResponse);

    const toolNames = extractContentFromTags(llmResponse, "response");
    if (!toolNames) {
      return [];
    }
    const toolNamesParsed = JSON.parse(toolNames);
    return toolNamesParsed.map((toolName: string) =>
      this.tools.find((t) => t.name === toolName),
    );
  }

  async proceedWithoutTools(input: string): Promise<string> {
    const llmResponse = await this.llmService.llm.generate(input);
    return llmResponse;
  }

  async proceedWithTools(input: string, tools: Tool[]): Promise<string> {
    const toolOutputs = await Promise.all(
      tools.map((tool) => tool.execute(input, this.llmService)),
    );
    const finalPrompt = finalResponseTemplate({
      input,
      tools,
      toolOutputs,
    });
    const output = await this.llmService.llm.generate(finalPrompt);
    const parsedOutput = extractContentFromTags(output, "response");
    return parsedOutput || "Could not generate response";
  }
}
