import { LLM, OpenAILLM } from "./llm";
import { Tool } from "./tools/tool";
import { Agent } from "./agent";

export interface ActionResult {
  tool?: Tool;
  output: string;
}

export class Workflow {
  agent: Agent;

  get fastllm() {
    return this.agent.fastllm;
  }

  get llm() {
    return this.agent.llm;
  }

  constructor(args: Partial<Workflow> = {}) {
    Object.assign(this, args);
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
    
    You are an AI agent tasked with providing the best possible response to the given input. You may use the tools listed above if they help generate a better or more accurate response. Your response must be actionable, contextually relevant, and formatted as a JSON object.
    
    Respond **only** with a JSON object in the following format:
    \`\`\`json
    {
        "response": "best_possible_response", // The best response to the input, only if no tool is needed
        "tool": "tool_name_or_null", // The name of the tool to use, or null if no tool is needed
        "tool_input": { /* input for the tool */ } // A JSON object containing the tool input (only if a tool is selected)
    }
    \`\`\`
    
    Guidelines:
    1. **Best Response**: The "response" field should contain the best answer to the input when no relevant tool is available.
    2. **Tool Usage**:
       - Use tools only when they help improve the quality of the response.
       - If no tools are required, set "tool" to \`null\`, omit "tool_input" and provide the best response.
    3. **Clarity and Relevance**:
       - Provide accurate, concise, and contextually appropriate responses.
       - Avoid redundant explanations or information outside the JSON structure.
    
    Examples:
    - Input: "What’s the weather like in Paris?"
      \`\`\`json
      {
          "response": null,
          "tool": "weather_tool",
          "tool_input": { "city": "Paris" }
      }
      \`\`\`
    - Input: "Hello"
      \`\`\`json
      {
          "response": "Hello! How can I assist you today?",
          "tool": null
      }
      \`\`\`
    
    Process the input and respond accordingly.
    `;
    try {
      const llmResponse = await this.fastllm.generate(prompt);

      // console.log("fast LLM raw response:", llmResponse);
      const action: ActionResult = this.parseLLMResponse(llmResponse);
      let output: string;
      if (action.tool) {
        const toolOutput = await action.tool.execute(action.output);
       // console.log({ toolOutput });

        // FEED TOOL OUTPUT BACK TO LLM
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
        return { output: toolInput || jsonResponse.response };
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
