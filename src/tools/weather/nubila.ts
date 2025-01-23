import { LLMService } from "../../services/llm-service";
import { APITool } from "../tool";
import { Tool } from "../../types";
import { extractContentFromTags } from "../../utils/parsers";
import { WeatherData } from "./types";

interface CurrentWeatherInput {
  lat: number;
  lon: number;
}

const NUBILA_URL = "https://api.nubila.ai/api/v1/";

export class CurrentWeatherAPITool extends APITool<CurrentWeatherInput> {
  constructor() {
    const name = "CurrentWeatherAPITool";
    const description = "Gets the current weather from Nubila API.";
    const baseUrl = NUBILA_URL + "weather";
    const twitterAccount = "nubilanetwork";

    super(name, description, baseUrl, twitterAccount);

    if (!process.env.NUBILA_API_KEY) {
      console.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }

  async execute(userInput: any): Promise<string> {
    try {
      const parsedInput = await this.parseInput(userInput);
      const weatherData = await this.fetchWeatherData(parsedInput);
      return this.formatWeatherData(parsedInput, weatherData);
    } catch (error: any) {
      console.error("Error fetching weather data, skipping...");
      console.error(error.message);
      return "Skipping weather data fetch.";
    }
  }

  async parseInput(userInput: any): Promise<CurrentWeatherInput> {
    const extractedCoords = await this.extractLocationWithLLM(userInput);
    const parsedCoords = JSON.parse(extractedCoords);

    if (!parsedCoords.lat || !parsedCoords.lon) {
      throw new Error("Could not extract latitude and longitude from query.");
    }

    return {
      lat: parsedCoords.lat,
      lon: parsedCoords.lon,
    };
  }

  private async fetchWeatherData(
    coords: CurrentWeatherInput,
  ): Promise<WeatherData> {
    const url = `${this.baseUrl}?lat=${coords.lat}&lon=${coords.lon}`;
    const apiKey = process.env.NUBILA_API_KEY as string;
    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorMessage = `API request failed with status: ${response.status} ${response.statusText}`;
      throw new Error(`Weather API Error: ${errorMessage}`);
    }

    const data = await response.json();

    return data.data;
  }

  private async formatWeatherData(
    coords: CurrentWeatherInput,
    weatherData: WeatherData,
  ): Promise<string> {
    const {
      condition,
      temperature,
      feels_like,
      humidity,
      pressure,
      wind_speed,
      wind_direction,
    } = weatherData;

    return `The current weather in ${coords.lat}, ${coords.lon} is ${condition} with a temperature of ${temperature}°C${feels_like && ` (Feels like ${feels_like}°C)`}.${humidity && ` Humidity: ${humidity}%`}${pressure && ` Pressure: ${pressure} hPa`}${wind_speed && ` Wind Speed: ${wind_speed} m/s`}${wind_direction && ` Wind Direction: ${wind_direction}°`}`;
  }

  private async extractLocationWithLLM(userInput: string): Promise<string> {
    const llmService = new LLMService();
    const llmResponse = await llmService.fastllm.generate(
      `Extract latitude and longitude from this query: "${userInput}". Return JSON in format <location>{lat: number, lon: number}</location>`,
    );
    const extractedCoords = extractContentFromTags(llmResponse, "location");
    if (!extractedCoords) {
      throw new Error("Could not extract latitude and longitude from query.");
    }
    return extractedCoords;
  }
}

export class ForecastWeatherAPITool implements Tool {
  name: string = "ForecastWeatherAPITool";
  description: string =
    "Get weather forecast data from the Nubila API. Input is json with latitude and longitude to retrieve weather data.";

  private apiKey: string = process.env.NUBILA_API_KEY!;
  private baseUrl: string = "https://api.nubila.ai/api/v1/forecast";

  constructor() {
    if (!process.env.NUBILA_API_KEY) {
      console.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }

  async execute(userInput: any): Promise<string> {
    if (
      !userInput ||
      typeof userInput !== "object" ||
      !("latitude" in userInput) ||
      !("longitude" in userInput)
    ) {
      return "Invalid input. Please provide a JSON object with 'latitude' and 'longitude' properties.";
    }

    const url = `${this.baseUrl}?lat=${userInput.latitude}&lon=${userInput.longitude}`;

    try {
      const response = await fetch(url, {
        headers: {
          "x-api-key": this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorMessage = `API request failed with status: ${response.status} ${response.statusText}`;
        return `Weather API Error: ${errorMessage}`;
      }

      const data = await response.json();
      const forecastData = data.data;

      if (
        !forecastData ||
        !Array.isArray(forecastData) ||
        forecastData.length === 0
      ) {
        return "No available weather data.";
      }

      const summaries = forecastData.map((item) => {
        const date = new Date(item.timestamp * 1000).toLocaleString();
        const temperature = item.temperature;
        const condition = item.condition_desc;
        const windSpeed = item.wind_speed;
        return `On ${date}, the temperature is ${temperature}°C, the weather is ${condition}, and the wind speed is ${windSpeed} m/s.`;
      });

      return (
        `Weather Forecast Data for ${userInput.latitude}, ${userInput.longitude}: ` +
        summaries.join(" ")
      );
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      return "Could not retrieve weather information. Please check the API or your network connection.";
    }
  }
}
