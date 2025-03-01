import { Tool } from "ai";

import { QSTool } from "../types";

export abstract class APITool<T> implements QSTool {
  name: string; // name of the tool, used in tool selection
  description: string; // what the tool does, used in tool selection
  output: string; // what the tool returns, used in tool selection
  twitterAccount: string; // used to tag the tool in tweets
  baseUrl: string; // used to fetch data from the tool
  schema: { name: string; tool: Tool }[];

  constructor(params: {
    name: string;
    description: string;
    baseUrl: string;
    twitterAccount?: string;
  }) {
    this.name = params.name;
    this.description = params.description;
    this.twitterAccount = params.twitterAccount || "";
    this.baseUrl = params.baseUrl;
  }

  abstract getRawData(params: T): Promise<any>;
}
