import axios from "axios";
import { APITool } from "./tool";
import { handleStreamResponse } from "../utils/stream_utils";
import { callDify } from "utils/dify";

export class DePINTool extends APITool {
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://dify.iotex.one/v1") {
    super(
      "DePIN Tool",
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
      apiKey,
    );
    this.baseUrl = baseUrl;
  }

  async execute(input: string): Promise<string> {
    return callDify(this.baseUrl, this.apiKey, input);
  }
}
