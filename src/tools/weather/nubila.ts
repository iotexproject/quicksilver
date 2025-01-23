import { LLMService } from "../../services/llm-service";
import { APITool } from "../tool";
import { extractContentFromTags } from "../../utils/parsers";
import { WeatherData, WeatherForecast } from "./types";

interface CoordinatesInput {
  lat: number;
  lon: number;
}

const NUBILA_URL = "https://api.nubila.ai/api/v1/";

abstract class BaseWeatherAPITool extends APITool<CoordinatesInput> {
  constructor(
    name: string,
    description: string,
    endpoint: string,
    output: string,
  ) {
    super({
      name,
      description,
      output,
      baseUrl: NUBILA_URL + endpoint,
      twitterAccount: "nubilanetwork",
    });

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
      return `Skipping weather ${this.name.toLowerCase()} fetch.`;
    }
  }

  async parseInput(userInput: any): Promise<CoordinatesInput> {
    return Coordinates.extractFromQuery(userInput, new LLMService());
  }

  protected async fetchWeatherData(coords: CoordinatesInput): Promise<any> {
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

  protected abstract formatWeatherData(
    coords: CoordinatesInput,
    data: any,
  ): Promise<string>;
}

export class CurrentWeatherAPITool extends BaseWeatherAPITool {
  constructor() {
    super(
      "CurrentWeatherAPITool",
      "Gets the current weather from Nubila API.",
      "weather",
      "temperature,condition,condition_desc,condition_code,temperature_min,temperature_max,feels_like,pressure,humidity,wind_speed,wind_scale,wind_direction,uv,luminance,elevation,rain,wet_bulb,timestamp,timezone,location_name,address,source,tag",
    );
  }

  protected async formatWeatherData(
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

export class ForecastWeatherAPITool extends BaseWeatherAPITool {
  constructor() {
    super(
      "ForecastWeatherAPITool",
      "Get weather forecast data from the Nubila API.",
      "forecast",
      "Array of: temperature,condition,condition_desc,condition_code,temperature_min,temperature_max,feels_like,pressure,humidity,wind_speed,wind_direction,uv,luminance,elevation,rain,wet_bulb,timestamp,timezone,location_name,address,source,tag",
    );
  }

  protected async formatWeatherData(
    coords: CoordinatesInput,
    forecastData: WeatherForecast,
  ): Promise<string> {
    const summaries = forecastData.map((item) => {
      const { temperature, condition_desc, wind_speed } = item;
      const date = new Date(item.timestamp * 1000).toLocaleString();
      return `On ${date}, the temperature is ${temperature}°C, the weather is ${condition_desc}, and the wind speed is ${wind_speed} m/s.`;
    });

    return `Weather Forecast Data for ${coords.lat}, ${coords.lon}: ${summaries.join(" ")}`;
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
