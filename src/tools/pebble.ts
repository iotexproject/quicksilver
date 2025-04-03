import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

const PebbleCoordinatesSchema = z.object({
  location: z.string().describe('Location address'),
});

type CoordinatesInput = z.infer<typeof PebbleCoordinatesSchema>;

const PebbleToolSchema = {
  name: 'PebbleTool',
  description: `
  Gets the current temperature, gas resistance, pressure, humidity from Pebble API. 
  Input is the location address that user want to retrieve data.
    `,
  parameters: PebbleCoordinatesSchema,
  execute: async (input: CoordinatesInput) => {
    const tool = new PebbleTool();
    return await tool.getRawData(input);
  },
};

export class PebbleTool extends APITool<CoordinatesInput> {
  schema = [
    {
      name: PebbleToolSchema.name,
      tool: tool(PebbleToolSchema),
    },
  ];

  geocodingAPI = 'https://maps.googleapis.com/maps/api/geocode/json';
  pebbleAPI = 'https://pebble-server.mainnet.iotex.io/v2/device_record';

  constructor() {
    super({
      name: PebbleToolSchema.name,
      description: PebbleToolSchema.description,
      baseUrl: 'https://pebble-server.mainnet.iotex.io/v2/device_record',
      twitterAccount: 'iotex_io',
    });
    if (!process.env.GOOGLE_APIKEY) {
      logger.error('Please set the GOOGLE_APIKEY environment variable.');
      return;
    }
    if (process.env.PEBBLE_API) {
      this.pebbleAPI = process.env.PEBBLE_API;
    }
  }

  async execute(location: CoordinatesInput): Promise<string> {
    return await this.getRawData(location);
  }

  async getRawData(userInput: CoordinatesInput): Promise<string> {
    PebbleCoordinatesSchema.parse(userInput);
    const geocodingURL = this.buildGeocodingURL(userInput.location);
    try {
      const location = await this.extractGeolocation(geocodingURL);
      const pebbleURL = this.buildPebbleURL(
        location.results[0].geometry.location.lat,
        location.results[0].geometry.location.lng
      );

      const data = await this.fetchPebbleData(pebbleURL);
      return `The current temperature in ${userInput} is ${data.temperature} with humidity ${data.humidity}, pressure ${data.pressure}, gas resistance ${data.gasResistance}`;
    } catch (e) {
      logger.error('Error fetch pebble data:', e);
      return 'Could not fetch pebble data.';
    }
  }

  private async extractGeolocation(geocodingURL: string): Promise<any> {
    let response = await fetch(geocodingURL, {
      signal: AbortSignal.timeout(5000),
    });
    const location = await response.json();
    if (location.status !== 'OK') {
      throw new Error('coding address error. need check google service');
    }
    return location;
  }

  private async fetchPebbleData(pebbleURL: string): Promise<any> {
    const response = await fetch(pebbleURL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const errorMessage = `Pebble API request failed with status: ${response.status} ${response.statusText}`;
      return `Pebble API Error: ${errorMessage}`;
    }

    const data = await response.json();
    return data;
  }

  private buildGeocodingURL(location: string): string {
    const googleAPIKey = process.env.GOOGLE_APIKEY;
    return `${this.geocodingAPI}?address=${encodeURIComponent(location)}&key=${googleAPIKey}`;
  }

  private buildPebbleURL(lat: number, lon: number): string {
    return `${this.pebbleAPI}?lat=${lat}&lon=${lon}`;
  }
}
