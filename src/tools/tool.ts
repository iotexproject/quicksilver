import { Tool } from "types";

export abstract class APITool<T> implements Tool {
  name: string;
  description: string;
  twitterAccount: string;

  constructor(name: string, description: string, twitterAccount?: string) {
    this.name = name;
    this.description = description;
    this.twitterAccount = twitterAccount || "";
  }

  abstract execute(input: string): Promise<string>;

  abstract parseInput(input: string): Promise<T>;
}
