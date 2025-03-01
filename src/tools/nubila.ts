import { z } from "zod";
import { Tool, tool } from "ai";

import { APITool } from "./tool";
import { logger } from "../logger/winston";
import { WeatherData, WeatherForecast } from "./types/nubila";

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

type CoordinatesInput = z.infer<typeof NubilaCoordinatesSchema>;

const CurrentWeatherToolSchema = {
  name: "get_current_weather",
  description:
    "Gets the current weather conditions for a specific location: temperature,condition,pressure,humidity,wind,uv,luminance,elevation,rain,wet_bulb",
  parameters: NubilaCoordinatesSchema,
  execute: async (input: CoordinatesInput) => {
    try {
      const tool = new CurrentWeatherAPITool();
      return await tool.getRawData(input);
    } catch (error) {
      logger.error("Error executing get_current_weather tool", error);
      return `Error executing get_current_weather tool`;
    }
  },
};

const ForecastWeatherToolSchema = {
  name: "get_forecast_weather",
  description:
    "Gets the weather forecast for a specific location with array of: temperature,condition,pressure,humidity,wind,uv,luminance,rain,wet_bulb",
  parameters: NubilaCoordinatesSchema,
  execute: async (input: CoordinatesInput) => {
    try {
      const tool = new ForecastWeatherAPITool();
      return await tool.getRawData(input);
    } catch (error) {
      logger.error("Error executing get_forecast_weather tool", error);
      return `Error executing get_forecast_weather tool`;
    }
  },
};

abstract class BaseWeatherAPITool extends APITool<CoordinatesInput> {
  abstract schema: { name: string; tool: Tool }[];

  constructor(name: string, description: string, endpoint: string) {
    super({
      name,
      description,
      baseUrl: NUBILA_URL + endpoint,
      twitterAccount: "nubilanetwork",
    });
    if (!process.env.NUBILA_API_KEY) {
      logger.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }

  public async getRawData(
    coords: CoordinatesInput
  ): Promise<WeatherData | WeatherForecast> {
    // Convert string values to numbers if needed
    const parsedCoords = {
      lat: typeof coords.lat === "string" ? parseFloat(coords.lat) : coords.lat,
      lon: typeof coords.lon === "string" ? parseFloat(coords.lon) : coords.lon,
    };

    const { lat, lon } = NubilaCoordinatesSchema.parse(parsedCoords);
    return this.fetchWeather(lat, lon);
  }

  private async fetchWeather(lat: number, lon: number) {
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
}

export class CurrentWeatherAPITool extends BaseWeatherAPITool {
  schema = [
    {
      name: CurrentWeatherToolSchema.name,
      tool: tool(CurrentWeatherToolSchema),
    },
  ];

  constructor() {
    super(
      CurrentWeatherToolSchema.name,
      CurrentWeatherToolSchema.description,
      "weather"
    );
  }
}

export class ForecastWeatherAPITool extends BaseWeatherAPITool {
  schema = [
    {
      name: ForecastWeatherToolSchema.name,
      tool: tool(ForecastWeatherToolSchema),
    },
  ];

  constructor() {
    super(
      ForecastWeatherToolSchema.name,
      ForecastWeatherToolSchema.description,
      "forecast"
    );
  }
}
