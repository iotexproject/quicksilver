
import { Agent } from './agent'; // Go up one level, then into src
import { OpenAILLM } from './llm'; // Go up one level, then into src
import { SimpleMemory } from './memory'; // Go up one level, then into src
import { Tool } from './tools/api_tool'; // Go up one level, then into src/tools
import { NewsAPITool } from './tools/newsapi'; // Go up one level, then into src/tools
import { WeatherTool } from './tools/weatherapi'; // Go up one level, then into src/tools
import { DePINTool } from 'tools/depin_tool';

const { OPENAI_API_KEY, NUBILA_API_KEY, NEWSAPI_API_KEY, DIFY_API_KEY } = process.env
if (!OPENAI_API_KEY || !NUBILA_API_KEY || !NEWSAPI_API_KEY || !DIFY_API_KEY) {
    throw new Error("Missing environment variables")
}

export class SentientAI {
    llm = new OpenAILLM(OPENAI_API_KEY!, "gpt-3.5-turbo"); // Use gpt-3.5-turbo for cost-effectiveness
    
    weatherTool = new WeatherTool(NUBILA_API_KEY!);
    newsTool = new NewsAPITool(NEWSAPI_API_KEY!);
    depinTool = new DePINTool(DIFY_API_KEY!);

    tools: Tool[] = [this.weatherTool, this.newsTool, this.depinTool];

    memory = new SimpleMemory();

    agent = new Agent(this.llm, this.tools, this.memory);
}