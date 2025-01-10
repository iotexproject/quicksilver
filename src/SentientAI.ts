import { Agent } from "./agent"; // Go up one level, then into src
import { NewsAPITool } from "./tools/newsapi"; // Go up one level, then into src/tools
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi"; // Go up one level, then into src/tools

export class SentientAI {
  currentWeatherAPITool = new CurrentWeatherAPITool(
    process.env.NUBILA_API_KEY!
  );
  forecastWeatherAPITool = new ForecastWeatherAPITool(
    process.env.OPENWEATHER_API_KEY!
  );
  newsTool = new NewsAPITool(process.env.NEWSAPI_API_KEY!);

  weatherAgent = new Agent({
    name: "Weather Agent",
    description:
      "Get current weather with currentWeatherAPITool and forecast weather with forecastWeatherAPITool.",
    tools: [this.currentWeatherAPITool, this.forecastWeatherAPITool],
  });

  agent = new Agent({
    tools: [this.weatherAgent, this.newsTool, this.currentWeatherAPITool, this.forecastWeatherAPITool],
  });
}
