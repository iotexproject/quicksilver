import { z } from 'zod';
import { tool } from 'ai';
import { APITool } from './tool';
import { logger } from '../logger/winston';

export const AIRVISUAL_BASE_URL = 'https://api.airvisual.com/v2';

const AirQualityResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    current: z.object({
      pollution: z.object({
        ts: z.string(),
        aqius: z.number(),
        mainus: z.string(),
        aqicn: z.number(),
        maincn: z.string(),
      }),
    }),
  }),
});

const GetNearestCityAirQualityToolSchema = {
  name: 'get_nearest_city_air_quality',
  description: 'Fetches air quality data for the nearest city using specified GPS coordinates. ',
  parameters: z.object({
    latitude: z.number().describe('Latitude coordinate'),
    longitude: z.number().describe('Longitude coordinate'),
  }),
  execute: async (args: { latitude: number; longitude: number }) => {
    const tool = new NearestCityExecutor();
    return tool.execute(args);
  },
};

abstract class AirQualityExecutor {
  protected async fetchFromAirVisual(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    return response.json();
  }

  protected async withErrorHandling<T>(operation: string, action: () => Promise<T>): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }

  abstract execute(args: any): Promise<any>;
}

class NearestCityExecutor extends AirQualityExecutor {
  async execute(args: { latitude: number; longitude: number }) {
    return this.withErrorHandling('get_nearest_city_air_quality', async () => {
      const url = this.buildUrl(args);
      const data = await this.fetchFromAirVisual(url);
      const parsedResponse = AirQualityResponseSchema.parse(data);
      return this.parseResult(parsedResponse);
    });
  }

  private buildUrl(params: { latitude: number; longitude: number }): string {
    const { latitude, longitude } = params;
    return `${AIRVISUAL_BASE_URL}/nearest_city?lat=${latitude}&lon=${longitude}&key=${process.env.AIRVISUAL_API_KEY}`;
  }

  private parseResult(parsedResponse: z.infer<typeof AirQualityResponseSchema>) {
    const { data } = parsedResponse;
    return {
      city: data.city,
      state: data.state,
      country: data.country,
      location: data.location,
      current: {
        pollution: {
          timestamp: data.current.pollution.ts,
          aqiUS: data.current.pollution.aqius,
          mainPollutantUS: data.current.pollution.mainus,
          aqiCN: data.current.pollution.aqicn,
          mainPollutantCN: data.current.pollution.maincn,
        },
      },
      units: {
        pollutants: {
          p2: { name: 'PM2.5 (Fine particulate matter)', unit: 'µg/m³' },
          p1: { name: 'PM10 (Coarse particulate matter)', unit: 'µg/m³' },
          o3: { name: 'Ozone (O3)', unit: 'ppb' },
          n2: { name: 'Nitrogen dioxide (NO2)', unit: 'ppb' },
          s2: { name: 'Sulfur dioxide (SO2)', unit: 'ppb' },
          co: { name: 'Carbon monoxide (CO)', unit: 'ppm' },
        },
        aqi: {
          aqius: 'US EPA standard (0-500 scale)',
          aqicn: 'China MEP standard (0-500 scale)',
          pollutantCodes: {
            p1: 'PM10',
            p2: 'PM2.5',
            o3: 'Ozone',
            n2: 'NO2',
            s2: 'SO2',
            co: 'CO',
          },
        },
      },
    };
  }
}

export class AirQualityTool extends APITool<{
  latitude: number;
  longitude: number;
}> {
  private static readonly nearestCityExecutor = new NearestCityExecutor();

  schema = [
    {
      name: GetNearestCityAirQualityToolSchema.name,
      tool: tool(GetNearestCityAirQualityToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetNearestCityAirQualityToolSchema.name,
      description: GetNearestCityAirQualityToolSchema.description,
      baseUrl: AIRVISUAL_BASE_URL,
      twitterAccount: 'IQAir',
    });
    if (!process.env.AIRVISUAL_API_KEY) {
      throw new Error('AIRVISUAL_API_KEY environment variable is required');
    }
  }

  async getRawData(params: { latitude: number; longitude: number }) {
    return AirQualityTool.nearestCityExecutor.execute(params);
  }
}
