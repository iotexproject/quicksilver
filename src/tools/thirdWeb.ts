import axios from 'axios';
import { z } from 'zod';
import { tool } from 'ai';
import { logger } from '../logger/winston';
import { APITool } from './tool';

interface NebulaAction {
  session_id: string;
  request_id: string;
  type: string;
  source: string;
  data: string;
}

interface NebulaResponse {
  message: string;
  actions: NebulaAction[];
  session_id: string;
  request_id: string;
}

interface ThirdWebParams {
  message: string;
}

const AskNebulaToolSchema = {
  name: 'ask_thirdweb',
  description:
    'Retrieve smart contract details (metadata, source code, ABI); Fetch comprehensive blockchain network information; Retrieve transaction details by transaction hash; Get block details by number or block hash; Check wallet balances; Obtain token metadata and price information; Interact with smart contracts (read/write functions); Execute native value transfers; Perform cross-chain token swaps and bridges; Analyze blockchain network data',
  parameters: z.object({
    message: z
      .string()
      .min(20)
      .describe(
        "The blockchain-related question to ask ThirdWeb. When querying ERC20 token metrics (supply, balance, etc.), always request token decimals information to ensure accurate number formatting. Example: Instead of 'What is the total supply?' use 'What is the total supply? Include token decimals and calculate the human-readable amount.'"
      ),
  }),
  execute: async (input: ThirdWebParams) => {
    try {
      const tool = new ThirdWebTool();
      return await tool.getRawData(input);
    } catch (error) {
      logger.error('Error executing ask_thirdweb tool', error);
      return `Error executing ask_thirdweb tool`;
    }
  },
};

export class ThirdWebTool extends APITool<ThirdWebParams> {
  schema = [{ name: AskNebulaToolSchema.name, tool: tool(AskNebulaToolSchema) }];

  constructor() {
    super({
      name: AskNebulaToolSchema.name,
      description: AskNebulaToolSchema.description,
      baseUrl: 'https://nebula-api.thirdweb.com/chat',
    });

    if (!process.env.THIRDWEB_SECRET_KEY) {
      throw new Error('Please set the THIRDWEB_SECRET_KEY environment variable.');
    }

    if (!process.env.THIRDWEB_SESSION_ID) {
      throw new Error('Please set the THIRDWEB_SESSION_ID environment variable.');
    }
  }

  public async getRawData(params: ThirdWebParams): Promise<NebulaResponse> {
    const validatedParams = AskNebulaToolSchema.parameters.parse(params);
    return this.askNebula(validatedParams);
  }

  private async askNebula(params: ThirdWebParams): Promise<NebulaResponse> {
    const secretKey = process.env.THIRDWEB_SECRET_KEY!;
    const sessionId = process.env.THIRDWEB_SESSION_ID!;
    const timeout = Number(process.env.THIRDWEB_REQUEST_TIMEOUT) || 60000;

    try {
      const response = await axios.post<NebulaResponse>(
        this.baseUrl,
        {
          message: params.message,
          stream: false,
          session_id: sessionId,
        },
        {
          headers: {
            'x-secret-key': secretKey,
            'Content-Type': 'application/json',
          },
          timeout: timeout,
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Request timed out after ${timeout / 1000} seconds`);
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication failed: Invalid ThirdWeb secret key');
        } else if (error.response?.status === 422) {
          throw new Error('Invalid request parameters');
        } else if (error.response?.status === 524) {
          throw new Error('Server timeout: The ThirdWeb API took too long to respond');
        }
      }
      throw error;
    }
  }
}
