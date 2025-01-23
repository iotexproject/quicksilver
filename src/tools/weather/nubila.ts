import { LLMService } from "../../services/llm-service";
import { APITool } from "../tool";
import { Tool } from "../../types";
import { extractContentFromTags } from "../../utils/parsers";
import { WeatherData, WeatherForecast } from "./types";

interface CoordinatesInput {
  lat: number;
  lon: number;
}

const NUBILA_URL = "https://api.nubila.ai/api/v1/";

export class CurrentWeatherAPITool extends APITool<CoordinatesInput> {
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

  async parseInput(userInput: any): Promise<CoordinatesInput> {
    return Coordinates.extractFromQuery(userInput, new LLMService());
  }

  private async fetchWeatherData(
    coords: CoordinatesInput,
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
    coords: CoordinatesInput,
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
}

export class ForecastWeatherAPITool extends APITool<CoordinatesInput> {
  constructor() {
    const name = "ForecastWeatherAPITool";
    const description = "Get weather forecast data from the Nubila API.";
    const baseUrl = NUBILA_URL + "forecast";
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
      const forecastData = await this.fetchWeatherData(parsedInput);
      return this.formatWeatherData(parsedInput, forecastData);
    } catch (error: any) {
      console.error("Error fetching weather data, skipping...");
      console.error(error.message);
      return "Skipping weather forecast fetch.";
    }
  }

  async parseInput(userInput: any): Promise<CoordinatesInput> {
    return Coordinates.extractFromQuery(userInput, new LLMService());
  }

  private async fetchWeatherData(
    coords: CoordinatesInput,
  ): Promise<WeatherForecast> {
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
    coords: CoordinatesInput,
    forecastData: WeatherForecast,
  ): Promise<string> {
    const summaries = forecastData.map((item) => {
      const { temperature, condition_desc, wind_speed } = item;
      const date = new Date(item.timestamp * 1000).toLocaleString();
      return `On ${date}, the temperature is ${temperature}°C, the weather is ${condition_desc}, and the wind speed is ${wind_speed} m/s.`;
    });

    return (
      `Weather Forecast Data for ${coords.lat}, ${coords.lon}: ` +
      summaries.join(" ")
    );
  }
}

export class Coordinates {
  constructor() {}

  static async extractFromQuery(
    query: string,
    llmService: LLMService,
  ): Promise<CoordinatesInput> {
    const llmResponse = await llmService.fastllm.generate(
      `Extract latitude and longitude from this query: "${query}". Return JSON in format <location>{"lat": number, "lon": number}</location>`,
    );
    const extractedCoords = extractContentFromTags(llmResponse, "location");
    if (!extractedCoords) {
      throw new Error("Could not extract latitude and longitude from query.");
    }
    const parsedCoords = JSON.parse(extractedCoords);

    if (!parsedCoords.lat || !parsedCoords.lon) {
      throw new Error("Could not extract latitude and longitude from query.");
    }

    return {
      lat: parsedCoords.lat,
      lon: parsedCoords.lon,
    };
  }
}
