import axios from "axios";
import { logger } from "../logger/winston";

import { APITool } from "./tool";
import { handleStreamResponse } from "../utils/stream_utils";
import { extractContentFromTags } from "../utils/parsers";
import { LLMService } from "../llm/llm-service";

export class DePINTool extends APITool<any> {
  constructor() {
    super({
      name: "DePIN Tool",
      description: `A tool for querying DePIN project token and market information.

      Example queries:
      - How many dimo vehicles?
      - What is the current IOTX price?

      Example output:
      - "There are 1000 dimo vehicles"
      - "The current IOTX market cap is $352,694,249"

      include project name keywords:
      - dimo
      - iotex

      Input should be a natural language question about DePIN token and market information.`,
      baseUrl: "https://dify.iotex.one/v1",
      output: "Textual response about DePIN tokens and market information",
    });

    if (!process.env.DEPIN_API_KEY) {
      throw new Error("Please set the DEPIN_API_KEY environment variable.");
    }
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const parsedInput = await this.parseInput(input, llmService);
      const apiKey = process.env.DEPIN_API_KEY!;
      return callDify(this.baseUrl, apiKey, parsedInput);
    } catch (e: any) {
      logger.error("Error fetching dify data, skipping...");
      logger.error(e.message);
      return `Skipping weather ${this.name.toLowerCase()} fetch.`;
    }
  }

  async parseInput(userInput: any, llmService: LLMService): Promise<any> {
    const prompt = `based on userInput: ${userInput}, return a new query related to DePIN market information and include it in <query> tags, like <query>new query</query>`;
    const llmResponse = await llmService.fastllm.generate(prompt);
    const extractedQuery = extractContentFromTags(llmResponse, "query");
    if (!extractedQuery) {
      throw new Error("Could not extract query from LLM response.");
    }
    return extractedQuery;
  }
}

export async function callDify(
  baseUrl: string,
  apiKey: string,
  input: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = "";

    streamResponse(
      baseUrl,
      apiKey,
      input,
      // onData callback
      (chunk: string) => {
        fullResponse += chunk;
      },
      // onComplete callback
      () => {
        resolve(fullResponse);
      },
      // onError callback
      (error: Error) => {
        reject(error);
      },
    );
  });
}

export async function streamResponse(
  baseUrl: string,
  apiKey: string,
  input: string,
  onData: (data: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    const response = await axios.post(
      `${baseUrl}/chat-messages`,
      {
        inputs: {},
        query: input,
        response_mode: "streaming",
        conversation_id: "",
        user: "quicksilver-user",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
      },
    );

    await handleStreamResponse(response, onData);
    onComplete?.();
  } catch (error: any) {
    logger.error(
      "DifyTool Streaming Error:",
      error.response?.data || error.message,
    );
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}
