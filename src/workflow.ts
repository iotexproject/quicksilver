import { finalResponseTemplate, toolSelectionTemplate } from "./templates";
import { LLMService } from "./services/llm-service";
import { Tool } from "./types";

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
      const tools = await this.selectTools(input);
      if (!tools.length) {
        return "No tools selected";
      }

      const toolOutputs = await Promise.all(tools.map(tool => tool.execute(input)));

      const finalPrompt = finalResponseTemplate({
        input,
        tools,
        toolOutputs,
      });
      const output = await this.llmService.llm.generate(finalPrompt);

      return output;
    } catch (error) {
      return "Processing Error: " + error;
    }
  }

  async selectTools(input: string): Promise<Tool[]> {
    const availableTools = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));

    if (!availableTools.length) {
      return [];
    }

    const toolSelectionPrompt = toolSelectionTemplate(input, availableTools);
    const llmResponse =
      await this.llmService.fastllm.generate(toolSelectionPrompt);

    console.log("llmResponse", llmResponse);

    const toolNames = extractContentFromTags(llmResponse, "tool_selection");
    if (!toolNames) {
      return [];
    }
    const toolNamesParsed = JSON.parse(toolNames);
    return toolNamesParsed.map((toolName: string) =>
      this.tools.find((t) => t.name === toolName),
    );
  }
}

const extractContentFromTags = (content: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "s");
  const match = content.match(regex);
  return match ? match[1] : null;
};
