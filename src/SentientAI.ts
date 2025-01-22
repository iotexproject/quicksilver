import { Agent } from "./agent";
import { NewsAPITool } from "./tools/newsapi";
import { DePINTool } from "./tools/depin_tool";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi";
import { IAgent } from "types";

export class SentientAI {
  agent: IAgent;

  constructor() {
    this.agent = new Agent({
      name: "SentientAI",
      description: "SentientAI is a tool that can help you with your tasks.",
      tools: [
        new NewsAPITool(),
        new DePINTool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
      ],
    });
  }
}
