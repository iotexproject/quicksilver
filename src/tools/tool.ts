import { LLMService } from "../llm/llm-service";
import { Tool } from "../types";

export abstract class APITool<T> implements Tool {
  name: string; // name of the tool, used in tool selection
  description: string; // what the tool does, used in tool selection
  output: string; // what the tool returns, used in tool selection
  twitterAccount: string; // used to tag the tool in tweets
  baseUrl: string; // used to fetch data from the tool

  constructor(params: {
    name: string;
    description: string;
    output: string;
    baseUrl: string;
    twitterAccount?: string;
  }) {
    this.name = params.name;
    this.description = params.description;
    this.output = params.output;
    this.twitterAccount = params.twitterAccount || "";
    this.baseUrl = params.baseUrl;
  }

  abstract execute(input: string, llmService: LLMService): Promise<string>;

  abstract parseInput(input: string, llmService: LLMService): Promise<T>;

  abstract getRawData(params: T): Promise<string>;
}
