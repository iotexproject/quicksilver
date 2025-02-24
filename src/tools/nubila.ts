import { z } from "zod";

import { LLMService } from "../llm/llm-service";
import { APITool } from "./tool";
import { extractContentFromTags } from "../utils/parsers";
import { WeatherData, WeatherForecast } from "./types/nubila";
import { coordinatesTemplate } from "./templates";
import { logger } from "../logger/winston";
import { Tool, tool } from "ai";

interface CoordinatesInput {
  lat: number;
  lon: number;
}

const NUBILA_URL = "https://api.nubila.ai/api/v1/";

const NubilaCoordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude coordinate between -90 and 90 degrees"),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude coordinate between -180 and 180 degrees"),
});

const CurrentWeatherToolSchema = {
  description: "Gets the current weather conditions for a specific location",
  parameters: NubilaCoordinatesSchema,
  execute: async (input: CoordinatesInput) => {
    const tool = new CurrentWeatherAPITool();
    return await tool.getRawData(input);
  },
};

const ForecastWeatherToolSchema = {
  description: "Gets the weather forecast for a specific location",
  parameters: NubilaCoordinatesSchema,
  execute: async (input: CoordinatesInput) => {
    const tool = new ForecastWeatherAPITool();
    return await tool.getRawData(input);
  },
};

abstract class BaseWeatherAPITool extends APITool<CoordinatesInput> {
  abstract schema: { name: string; tool: Tool }[];

  constructor(
    name: string,
    description: string,
    endpoint: string,
    output: string
  ) {
    super({
      name,
      description,
      output,
      baseUrl: NUBILA_URL + endpoint,
      twitterAccount: "nubilanetwork",
    });
    if (!process.env.NUBILA_API_KEY) {
      logger.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }

  async execute(userInput: any, llmService: LLMService): Promise<string> {
    try {
      const parsedInput = await this.parseInput(userInput, llmService);
      const weatherData = await this.getRawData(parsedInput);
      return this.formatWeatherData(parsedInput, weatherData);
    } catch (error: any) {
      logger.error("Error fetching weather data, skipping...");
      logger.error(error.message);
      return `Skipping weather ${this.name.toLowerCase()} fetch.`;
    }
  }

  async parseInput(
    userInput: any,
    llmService: LLMService
  ): Promise<CoordinatesInput> {
    return Coordinates.extractFromQuery(userInput, llmService);
  }

  public async getRawData(coords: CoordinatesInput): Promise<any> {
    const { lat, lon } = coords;
    if (!lat || !lon) {
      throw new Error("Latitude and longitude are required.");
    }
    const url = `${this.baseUrl}?lat=${lat}&lon=${lon}`;
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
    data: any
  ): Promise<string>;
}

export class CurrentWeatherAPITool extends BaseWeatherAPITool {
  schema = [
    { name: "CurrentWeatherAPITool", tool: tool(CurrentWeatherToolSchema) },
  ];

  constructor() {
    super(
      "CurrentWeatherAPITool",
      "Gets the current weather from Nubila API.",
      "weather",
      "temperature,condition,pressure,humidity,wind,uv,luminance,elevation,rain,wet_bulb"
    );
  }

  protected async formatWeatherData(
    coords: CoordinatesInput,
    weatherData: WeatherData
  ): Promise<string> {
    const {
      condition,
      temperature,
      feels_like,
      humidity,
      pressure,
      wind_speed,
      wind_direction,
      uv,
      luminance,
      elevation,
      rain,
      wet_bulb,
      location_name,
    } = weatherData;

    return `
The current weather in ${location_name} (${coords.lat}, ${coords.lon}) is:
Condition: ${condition},
Temperature: ${temperature}°C${feels_like && ` (Feels like ${feels_like}°C)`},
Humidity: ${humidity}%,
Pressure: ${pressure} hPa,
Wind Speed: ${wind_speed} m/s,
Wind Direction: ${wind_direction}°,
UV: ${uv},
Luminance: ${luminance},
Elevation: ${elevation} m,
Rain: ${rain},
Wet Bulb: ${wet_bulb}°C,
`;
  }
}

export class ForecastWeatherAPITool extends BaseWeatherAPITool {
  schema = [
    { name: "ForecastWeatherAPITool", tool: tool(ForecastWeatherToolSchema) },
  ];

  constructor() {
    super(
      "ForecastWeatherAPITool",
      "Get weather forecast data from the Nubila API.",
      "forecast",
      "Array of: temperature,condition,pressure,humidity,wind,uv,luminance,rain,wet_bulb"
    );
  }

  protected async formatWeatherData(
    coords: CoordinatesInput,
    forecastData: WeatherForecast
  ): Promise<string> {
    const summaries = forecastData.map((item) => {
      const {
        temperature,
        condition,
        condition_desc,
        wind_speed,
        pressure,
        humidity,
        uv,
        luminance,
        rain,
        wet_bulb,
      } = item;
      const date = new Date(item.timestamp * 1000).toLocaleString();
      return `On ${date}, ${temperature}°C, ${condition}, ${condition_desc}, ${wind_speed} m/s, ${pressure} hPa, ${humidity}%, ${uv}, ${luminance}, ${rain}, ${wet_bulb}°C.`;
    });

    return `
Weather Forecast Data for ${forecastData[0].location_name} (${coords.lat}, ${coords.lon}):
temperature,condition,condition_desc,wind_speed,pressure,humidity,uv,luminance,rain,wet_bulb
${summaries.join("\n")}
`;
  }
}

export class Coordinates {
  constructor() {}

  static async extractFromQuery(
    query: string,
    llmService: LLMService
  ): Promise<CoordinatesInput> {
    const llmResponse = await llmService.fastllm.generate(
      coordinatesTemplate(query)
    );
    const extractedCoords = extractContentFromTags(llmResponse, "response");
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
