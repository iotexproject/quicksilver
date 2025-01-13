import { DummyLLM } from "../src/llm";
import { Tool } from "../src/tools/tool";
import { Workflow } from "../src/workflow";
import { Agent } from "../src/agent";

// Dummy Tool
class EchoTool implements Tool {
  name = "Echo";
  description = "Repeats the input back to you.";
  async execute(input: string): Promise<string> {
    return `Echo: ${input}`;
  }
}

async function runDummyAgent() {
  const llm = new DummyLLM();
  const echoTool: Tool = new EchoTool(); // Explicitly type echoTool
  const tools: Tool[] = [echoTool];
  const workflow = new Workflow({ llm });
  const agent = new Agent({ llm, tools });

  const inputs = [
    "Hello, Quicksilver!",
    "Repeat that again.", // Demonstrates memory
    "What is your name?", // Demonstrates no tool needed
  ];

  for (const input of inputs) {
    console.log(`User Input: ${input}`);
    const response = await agent.execute(input);
    console.log(`Agent Response: ${response}`);
    console.log("----");
  }
}

runDummyAgent();
