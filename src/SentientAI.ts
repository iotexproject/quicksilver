import { Agent } from "./agent";
import { NewsAPITool } from "./tools/newsapi";
import { DePINTool } from "./tools/depin_tool";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi";

export class SentientAI {
  weatherAgent = new Agent({
    tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
  });

  depinTool = new DePINTool();
  newsTool = new NewsAPITool();

  agent = new Agent({
    tools: [this.weatherAgent, this.depinTool, this.newsTool],
  });
}
