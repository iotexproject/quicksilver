import axios from "axios";
import { handleStreamResponse } from "./stream_utils";

export async function callDify(
  baseUrl: string,
  apiKey: string,
  input: string
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
      }
    );
  });
}

export async function streamResponse(
  baseUrl: string,
  apiKey: string,
  input: string,
  onData: (data: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
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
      }
    );

    await handleStreamResponse(response, onData);
    onComplete?.();
  } catch (error: any) {
    console.error(
      "DifyTool Streaming Error:",
      error.response?.data || error.message
    );
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}
