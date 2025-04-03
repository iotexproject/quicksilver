import { logger } from '../src/logger/winston';
import * as dotenv from 'dotenv';
import { SentientAI } from '../src/sentientAI'; // Import SentientAI

dotenv.config();

async function main() {
  const sentientAI = new SentientAI();

  // read users' input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Create a function to handle user input recursively
  const askQuestion = async () => {
    rl.question('Enter your input (or "exit" to quit): ', async (input: string) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      logger.info(`User Input: ${input}`);
      try {
        const response = await sentientAI.execute(input);
        logger.info(`Binoai Response:\n${response}`);
      } catch (error) {
        logger.error('Binoai Error:', error);
      }
      logger.info('----');

      // Ask for next input
      askQuestion();
    });
  };

  // Start the conversation
  askQuestion();

  // Move rl.close() to the exit condition above
}

main();
