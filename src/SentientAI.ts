import { QueryOrchestrator } from "./workflow";
import { NewsAPITool } from "./tools/news/newsapi";
import { DePINTool } from "./tools/depin_tool";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weather/nubila";

export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    this.orchestrator = new QueryOrchestrator({
      tools: [
        new NewsAPITool(),
        new DePINTool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
      ],
    });
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
