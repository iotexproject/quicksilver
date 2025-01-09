import { OpenAILLM, LLM } from "../llm";
import { Tool } from "./api_tool";

export class WeatherTool implements Tool {
  name: string = "OpenWeatherAPI";
  description: string =
    "Get weather forecast data from the OpenWeather API. Entering a question containing a city name will return the weather forecast for that city.";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async execute(input: string): Promise<string> {
    const llm: LLM = new OpenAILLM(process.env.OPENAI_API_KEY!, "gpt-4");
    const cityName = await llm.generate(
      `Extract the city name from the user's input: ${input}`
    );
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${this.apiKey}`
      );
      const data = await response.json();
      const list = data?.list;
      if (list) {
        const weatherSummaries = summarizeWeatherData(cityName, list);
        return llm.generate(
          weatherSummaries + `Based on the data above, answer “${input}”`
        );
      } else {
        return `Error fetching weather information: ${data.message}`;
      }
    } catch (error) {
      return "Could not retrieve weather information. Please check the API or your network connection.";
    }
  }
}

function summarizeWeatherData(city: string, weatherList: any[]) {
  if (!Array.isArray(weatherList) || weatherList.length === 0) {
    return "No available weather data.";
  }
  const summaries = weatherList.map((item) => {
    const date = item.dt_txt; // Use dt_txt for the date
    const temperature = (item.main.temp - 273.15).toFixed(2); // Convert Kelvin to Celsius
    const weatherDescription = item.weather[0].description; // Weather description
    const windSpeed = item.wind.speed; // Wind speed
    return `On ${date}, the temperature is ${temperature}°C, the weather is ${weatherDescription}, and the wind speed is ${windSpeed} m/s.`;
  });
  return `Weather Forecast Data for ${city}: ` + summaries.join(" ");
}
