import { Agent } from "./agent"; // Go up one level, then into src
import { NewsAPITool } from "./tools/newsapi"; // Go up one level, then into src/tools
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi"; // Go up one level, then into src/tools

const { OPENAI_API_KEY, NUBILA_API_KEY, OPENWEATHER_API_KEY, NEWSAPI_API_KEY } =
  process.env;
if (
  !OPENAI_API_KEY ||
  !NUBILA_API_KEY ||
  !OPENWEATHER_API_KEY ||
  !NEWSAPI_API_KEY
) {
  throw new Error("Missing environment variables");
}

export class SentientAI {
  weatherAgent = new Agent({
    name: "Weather Agent",
    description:
      "Get current weather with CurrentWeatherAPITool and forecast weather with ForecastWeatherAPITool.",
    tools: [
      new CurrentWeatherAPITool(NUBILA_API_KEY!),
      new ForecastWeatherAPITool(OPENWEATHER_API_KEY!),
    ],
  });

  newsTool = new NewsAPITool(NEWSAPI_API_KEY!);

  agent = new Agent({
    tools: [this.weatherAgent, this.newsTool],
  });
}
