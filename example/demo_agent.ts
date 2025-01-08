import { OpenAILLM, LLM } from '../src/llm'; // Go up one level, then into src
import { WeatherTool } from '../src/tools/weatherapi'; // Go up one level, then into src/tools
import { NewsAPITool } from '../src/tools/newsapi'; // Go up one level, then into src/tools
import { Agent } from '../src/agent'; // Go up one level, then into src
import { SimpleMemory } from '../src/memory'; // Go up one level, then into src
import { Tool } from '../src/tools/api_tool'; // Go up one level, then into src/tools
import * as dotenv from 'dotenv';
import chalk from 'chalk'; // Import chalk for colored output

dotenv.config();

async function main() {
  let llm: LLM;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(chalk.red("Please set the OPENAI_API_KEY environment variable."));
    return;
  }
  llm = new OpenAILLM(apiKey, "gpt-3.5-turbo"); // Use gpt-3.5-turbo for cost-effectiveness

  const weatherApiKey = process.env.NUBILA_API_KEY;
  if (!weatherApiKey) {
    console.error(chalk.red("Please set the NUBILA_API_KEY environment variable."));
    return;
  }

  const newsApiKey = process.env.NEWSAPI_API_KEY;
  if (!newsApiKey) {
    console.error(chalk.red("Please set the NEWSAPI_API_KEY environment variable."));
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
    rl.question(chalk.cyan('Enter your input (or "exit" to quit): '), async (input: string) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        console.log(chalk.green("Goodbye!"));
        return;
      }

      // console.log(chalk.blue(`User Input: ${input}`));
      try {
        const response = await agent.run(input);
        console.log(chalk.cyan(`Agent Response:`));
        console.log(chalk.yellow(response));
      } catch (error) {
        console.error(chalk.red("Agent Error:"), error);
      }
      console.log(chalk.gray("----"));
      
      // Ask for next input
      askQuestion();
    });
  };

  // Start the conversation
  askQuestion();

  // Move rl.close() to the exit condition above
}

main();