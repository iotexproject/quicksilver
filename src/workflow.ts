import { FastLLM, LLM, OpenAILLM, OpenAIRAG } from "./llm";
import { Tool } from "./tools/tool";
import { Agent } from "./agent";

export interface ActionResult {
  tool?: Tool;
  output: string;
}

export class Workflow {
  fastllm: LLM;
  llm: LLM;
  agent: Agent;

  constructor(args: Partial<Workflow> = {}) {
    Object.assign(this, args);
    if (!this.fastllm) {
      this.fastllm = new FastLLM();
    }
    if (!this.llm) {
      this.llm = new OpenAIRAG();
    }
  }

  async execute(input: string): Promise<string> {
    const availableTools = this.agent.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));

    // TODO: retrieve data from vector database

    const prompt = `
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
    console.log("prompt:", prompt);
    try {
      const llmResponse = await this.fastllm.generate(prompt);

      console.log("fast LLM raw response:", llmResponse);
      const action: ActionResult = this.parseLLMResponse(llmResponse);
      let output: string;
      if (action.tool) {
        const toolOutput = await action.tool.execute(action.output);

        console.log("toolOutput:", toolOutput);

        // FEED TOOL OUTPUT BACK TO LLM
        // Previous Conversation: ${JSON.stringify(this.memory.loadMemoryVariables().history)}
        const finalPrompt = this.agent.prompt({
          input,
          tool: action.tool,
          toolOutput,
          toolInput: action.output,
        });
        output = await this.llm.generate(finalPrompt);
      } else {
        output = action.output; // LLM handles it directly (no tool used)
      }

      // this.memory.saveContext(input, output);

      return output;
    } catch (error) {
      console.error("Workflow Error:", error);
      return "Workflow Error: " + error; // Return a user-friendly error message
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
        const tool = this.agent.tools.find((t) => t.name === toolName);
        if (tool) {
          return { tool, output: toolInput };
        } else {
          return { output: `Tool "${toolName}" not found.` };
        }
      } else {
        return { output: toolInput || "No tool needed." };
      }
    } catch (error) {
      console.error(
        "Error parsing LLM response:",
        error,
        "Raw LLM Response:",
        llmResponse,
      );
      return {
        output: `Error parsing LLM response: ${error}. Raw Response: ${llmResponse}.`,
      };
    }
  }
}
