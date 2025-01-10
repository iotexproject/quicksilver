import { OpenAILLM, LLM } from "../src/llm";
import { IoIDTool } from "../src/tools/ioId";
import { Agent } from "../src/agent";
import { SimpleMemory } from "../src/memory";
import { Tool } from "../src/tools/tool";
import * as dotenv from "dotenv";

dotenv.config();

async function runExample() {
  // Initialize the LLM with API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: Please set the OPENAI_API_KEY environment variable.");
    return;
  }

  const llm: LLM = new OpenAILLM(apiKey, "gpt-4"); // Use "gpt-3.5-turbo" for cost-effectiveness if needed

  // Initialize tools, memory, and agent
  const ioidTool = new IoIDTool();
  const tools: Tool[] = [ioidTool];
  const memory = new SimpleMemory();
  const agent = new Agent({ llm, tools, memory });

  // User inputs to process
  const inputs = [
    "Provide Project ID for Network3.",
    "What's the Project ID for IoTeXLab?",
  ];

  for (const input of inputs) {
    console.log(`User Input: ${input}`);
    try {
      const response = await agent.execute(input);
      console.log(`Agent Response:\n${response}`);
    } catch (error) {
      console.error(
        `Error while processing input "${input}":`,
        error instanceof Error ? error.message : error
      );
    }
    console.log("----");
  }
}

// Run the example
runExample();
