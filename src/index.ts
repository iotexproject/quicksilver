// src/index.ts (Example/test file)
import { DummyLLM, OpenAILLM, LLM } from "./llm";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi";
import { NewsAPITool } from "./tools/newsapi";
import { Agent } from "./agent";
import { SimpleMemory } from "./memory";
import { Tool } from "./tools/tool";
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
    llm = new OpenAILLM(apiKey, "gpt-4");
  } else {
    llm = new DummyLLM();
  }

  const nubilaApiKey = process.env.NUBILA_API_KEY; // Get Nubila API Key
  if (!nubilaApiKey) {
    console.error("Please set the NUBILA_API_KEY environment variable.");
    return;
  }

  const openWeatherApiKey = process.env.OPEN_WEATHER_API_KEY;
  if (!openWeatherApiKey) {
    console.error("Please set the OPEN_WEATHER_API_KEY environment variable.");
    return;
  }

  const newsApiKey = process.env.NEWSAPI_API_KEY;
  if (!newsApiKey) {
    console.error("Please set the NEWSAPI_API_KEY environment variable.");
    return;
  }

  const weatherAgent = new Agent({
    tools: [
      new CurrentWeatherAPITool(nubilaApiKey),
      new ForecastWeatherAPITool(openWeatherApiKey),
    ],
  });

  const newsTool = new NewsAPITool(newsApiKey);

  const tools: Tool[] = [weatherAgent, newsTool];
  const memory = new SimpleMemory();
  const agent = new Agent({ llm, tools, memory });

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
