import axios from 'axios';
import { APITool } from './tool';
import { handleStreamResponse } from '../utils/stream_utils';

export class DePINTool extends APITool {
  baseUrl = 'https://dify.iotex.one/v1'

  constructor(
  ) {
    super(
      'DePIN Tool',
      `A tool for querying depin project token and market information. Can handle queries like:
      - Current IOTX token price and market data
      - IOTX token price history and trends
      - Market cap and trading volume information
      - Token price comparisons and analysis
      - Market sentiment and price predictions

      Example queries:
      - "What is the current IOTX price?"

      include project name keywords:
      - dimo
      - iotex

      Input should be a natural language question about DePIN token and market information.`,
      process.env.DEPIN_API_KEY!
    );
  }

  async execute(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';

      this.streamResponse(input,
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

  async streamResponse(
    input: string,
    onData: (data: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat-messages`,
        {
          inputs: {},
          query: input,
          response_mode: 'streaming',
          conversation_id: '',
          user: 'quicksilver-user',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      await handleStreamResponse(response, onData);
      onComplete?.();

    } catch (error: any) {
      console.error('DifyTool Streaming Error:', error.response?.data || error.message);
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  }
}
