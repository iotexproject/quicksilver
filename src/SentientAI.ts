import { Agent } from "./agent"; // Go up one level, then into src
import { NewsAPITool } from "./tools/newsapi"; // Go up one level, then into src/tools
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi"; // Go up one level, then into src/tools

export class SentientAI {
  weatherAgent = new Agent({
    tools: [
      new CurrentWeatherAPITool(process.env.NUBILA_API_KEY!),
      new ForecastWeatherAPITool(process.env.OPEN_WEATHER_API_KEY!),
    ],
  });

  newsTool = new NewsAPITool(process.env.NEWSAPI_API_KEY!);

  agent = new Agent({
    tools: [this.weatherAgent, this.newsTool],
  });
}
