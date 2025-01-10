import { callDify } from 'utils/dify';
import { APITool } from './api_tool';

export class DePINTool extends APITool {
  private readonly baseUrl: string;

  constructor(
    apiKey: string, 
    baseUrl: string = 'https://dify.iotex.one/v1'
  ) {
    super(
      'DePIN Tool',
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
      apiKey
    );
    this.baseUrl = baseUrl;
  }

  async execute(input: string): Promise<string> {
    return callDify(this.baseUrl, this.apiKey, input);
  }
} 