import { callDify } from "../utils/dify";
import { APITool } from "./tool";

export class DePINTool extends APITool {
  private readonly baseUrl: string = "https://dify.iotex.one/v1";

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
      process.env.DEPIN_API_KEY!,
    );
  }

  async execute(input: string): Promise<string> {
    return callDify(this.baseUrl, this.apiKey, input);
  }
}
