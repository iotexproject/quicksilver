import * as dotenv from 'dotenv';
import readline from 'readline';
import { SentientAI } from '../src/SentientAI'; // Import SentientAI

dotenv.config();

async function main() {
  const sentientAI = new SentientAI();  

  // read users' input
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

      // console.log(`User Input: ${input}`);
      try {
        const response = await sentientAI.agent.execute(input);
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
