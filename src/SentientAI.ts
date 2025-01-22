import { Workflow } from "./workflow";
import { NewsAPITool } from "./tools/newsapi";
import { DePINTool } from "./tools/depin_tool";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi";

export class SentientAI {
  workflow: Workflow;

  constructor() {
    this.workflow = new Workflow({
      tools: [
        new NewsAPITool(),
        new DePINTool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
      ],
    });
  }

  async execute(input: string): Promise<string> {
    return this.workflow.execute(input);
  }
}

export default SentientAI;
