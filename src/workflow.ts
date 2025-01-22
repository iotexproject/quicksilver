import { LLMService } from "./services/llm-service";
import { Tool, PromptContext, ActionResult } from "./types";

export class Workflow {
  llmService: LLMService;
  tools: Tool[] = [];
  prompt: (ctx: PromptContext) => string;

  constructor({
    tools,
    prompt,
  }: {
    tools: Tool[];
    prompt?: (ctx: PromptContext) => string;
  }) {
    this.tools = tools;
    this.prompt = prompt ? prompt : defaultTemplate;
    this.llmService = new LLMService();
  }

  async execute(input: string): Promise<string> {
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

        // FEED TOOL OUTPUT BACK TO LLM
        const finalPrompt = this.prompt({
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
      return "Workflow Error: " + error;
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

const defaultTemplate = (ctx: PromptContext) => `
User Input: ${ctx.input}
Tool Used: ${ctx.tool.name}
Tool Input: ${ctx.toolInput}
Tool Output: ${ctx.toolOutput}

Generate a human-readable response based on the tool output${ctx.tool.twitterAccount ? ` and mention x handle ${ctx.tool.twitterAccount} in the end.` : ""}`;

const toolSelectionTemplate = (
  input: string,
  availableTools: { name: string; description: string }[],
) => `
Input: ${input}

Available Tools: ${JSON.stringify(availableTools)}

Only respond with a JSON object in the following format:
\`\`\`json
{
    "tool": "tool_name_or_null", // The name of the tool to use, or null if no tool is needed
    "tool_input": "input_for_the_tool" // The input to pass to the tool in json format (only if a tool is selected)
}
\`\`\`
If no tool is needed, set "tool" to null.
`;
