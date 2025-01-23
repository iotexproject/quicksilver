import axios from "axios";

import { APITool } from "../tool";
import { handleStreamResponse } from "../../utils/stream_utils";

export class DePINTool extends APITool<any> {
  constructor() {
    super(
      "DePIN Tool",
      `A tool for querying DePIN project token and market information.

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
      "https://dify.iotex.one/v1",
    );

    // api key not implemented
    // if (!process.env.DEPIN_API_KEY) {
    //   throw new Error("Please set the DEPIN_API_KEY environment variable.");
    // }
  }

  async execute(input: string): Promise<string> {
    // api key not implemented, update this when it is
    const apiKey = process.env.DEPIN_API_KEY || "";
    return callDify(this.baseUrl, apiKey, input);
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
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
    console.error(
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
