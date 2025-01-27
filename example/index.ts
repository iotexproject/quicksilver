// src/index.ts (Example/test file)
import { DummyLLM, OpenAILLM, LLM } from "../src/llm";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../src/tools/nubila";
import { NewsAPITool } from "../src/tools/newsapi";
import { Agent } from "../src/agent";
import { Tool } from "../src/tools/tool";
import * as dotenv from "dotenv";

dotenv.config();

async function runExample() {
  let llm: LLM;
  const useOpenAI = process.env.USE_OPENAI === "true";

  if (useOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Please set the OPENAI_API_KEY environment variable.");
      return;
    }
    llm = new OpenAILLM();
  } else {
    llm = new DummyLLM();
  }

  const weatherAgent = new Agent({
    tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
  });

  const newsTool = new NewsAPITool();

  const agent = new Agent({ tools: [weatherAgent, newsTool] });

  const inputs = [
    "Hello World",
    "Post something",
    "What is the weather?",
    "what is the headline today",
    "What's the weather forecast for London?",
  ];

  for (const input of inputs) {
    console.log(`User Input: ${input}`);
    try {
      const response = await agent.execute(input);
      console.log(`Agent Response: ${response}`);
    } catch (error) {
      console.error("Error running agent:", error);
    }
    console.log("----");
  }
}

runExample();
