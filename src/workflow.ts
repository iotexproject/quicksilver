import { finalResponseTemplate, toolSelectionTemplate } from "./templates";
import { LLMService } from "./services/llm-service";
import { Tool, ActionResult } from "./types";

export class QueryOrchestrator {
  llmService: LLMService;
  tools: Tool[] = [];

  constructor({ tools }: { tools: Tool[] }) {
    this.tools = tools;
    this.llmService = new LLMService();
  }

  async process(input: string): Promise<string> {
    const availableTools = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));

    // TODO: retrieve data from vector database

    const toolSelectionPrompt = toolSelectionTemplate(input, availableTools);
    try {
      const llmResponse =
        await this.llmService.fastllm.generate(toolSelectionPrompt);

      const action: ActionResult = this.parseLLMResponse(llmResponse);
      let output: string;
      if (action.tool) {
        const toolOutput = await action.tool.execute(action.output);

        const finalPrompt = finalResponseTemplate({
          input,
          tool: action.tool,
          toolOutput,
          toolInput: action.output,
        });
        output = await this.llmService.llm.generate(finalPrompt);
      } else {
        output = action.output; // LLM handles it directly (no tool used)
      }

      return output;
    } catch (error) {
      return "Processing Error: " + error;
    }
  }

  private parseLLMResponse(llmResponse: string): ActionResult {
    try {
      // Use regex to extract the first JSON object
      const jsonMatch = llmResponse.match(/{(?:[^{}]|{[^{}]*})*}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in LLM response.");
      }

      const json_string = jsonMatch[0];
      const jsonResponse = JSON.parse(json_string);
      const toolName = jsonResponse.tool;
      let toolInput;
      try {
        toolInput = JSON.parse(jsonResponse.tool_input);
      } catch (error) {
        toolInput = jsonResponse.tool_input;
      }

      if (toolName) {
        const tool = this.tools.find((t) => t.name === toolName);
        if (tool) {
          return { tool, output: toolInput };
        } else {
          return { output: `Tool "${toolName}" not found.` };
        }
      } else {
        return { output: toolInput || "No tool needed." };
      }
    } catch (error) {
      return {
        output: `Error parsing LLM response: ${error}. Raw Response: ${llmResponse}.`,
      };
    }
  }
}

