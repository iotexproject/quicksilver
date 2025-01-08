import { OpenAILLM, LLM } from '../src/llm'; // Go up one level, then into src
import { WeatherTool } from '../src/tools/weatherapi'; // Go up one level, then into src/tools
import { NewsAPITool } from '../src/tools/newsapi'; // Go up one level, then into src/tools
import { Agent } from '../src/agent'; // Go up one level, then into src
import { SimpleMemory } from '../src/memory'; // Go up one level, then into src
import { Tool } from '../src/tools/api_tool'; // Go up one level, then into src/tools
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  let llm: LLM;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Please set the OPENAI_API_KEY environment variable.");
    return;
  }
  llm = new OpenAILLM(apiKey, "gpt-3.5-turbo"); // Use gpt-3.5-turbo for cost-effectiveness

  const weatherApiKey = process.env.NUBILA_API_KEY;
  if (!weatherApiKey) {
    console.error("Please set the NUBILA_API_KEY environment variable.");
    return;
  }

  const newsApiKey = process.env.NEWSAPI_API_KEY;
  if (!newsApiKey) {
    console.error("Please set the NEWSAPI_API_KEY environment variable.");
    return;
  }

  const weatherTool = new WeatherTool(weatherApiKey);
  const newsTool = new NewsAPITool(newsApiKey);

  const tools: Tool[] = [weatherTool, newsTool]; // Only Weather and News tools
  const memory = new SimpleMemory();
  const agent = new Agent(llm, tools, memory);

  // read users' input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Create a function to handle user input recursively
  const askQuestion = async () => {
    rl.question('Enter your input (or "exit" to quit): ', async (input: string) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      console.log(`User Input: ${input}`);
      try {
        const response = await agent.run(input);
        console.log(`Binoai Response:\n${response}`);
      } catch (error) {
        console.error("Binoai Error:", error);
      }
      console.log("----");
      
      // Ask for next input
      askQuestion();
    });
  };

  // Start the conversation
  askQuestion();

  // Move rl.close() to the exit condition above
}

main();
