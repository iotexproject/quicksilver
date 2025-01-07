import { DummyLLM } from '../src/llm';
import { Tool } from '../src/tools/tool';
import { Memory, SimpleMemory } from '../src/memory';
import { Workflow } from '../src/workflow';
import { Agent } from '../src/agent';

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
    const memory = new SimpleMemory();
    const workflow = new Workflow(llm, tools, memory);
    const agent = new Agent(llm, tools, memory);

    const inputs = [
        "Hello, Quicksilver!",
        "Repeat that again.", // Demonstrates memory
        "What is your name?", // Demonstrates no tool needed
    ];

    for (const input of inputs) {
        console.log(`User Input: ${input}`);
        const response = await agent.run(input);
        console.log(`Agent Response: ${response}`);
        console.log("----");
    }
}

runDummyAgent();