import { Tool } from './tool';

export class PebbleTool implements Tool {
  name: string = 'PebbleTool';
  description: string = `
  Gets the current temperature, gas resistance, pressure, humidity from Pebble API. 
  Input is the location address that user want to retrieve data.
    `;

  geocodingAPI: string = 'https://maps.googleapis.com/maps/api/geocode/json';
  googleAPIKey: string;
  pebbleAPI: string = 'https://pebble-server.mainnet.iotex.io/v2/device_record';

  constructor() {
    if (!process.env.GOOGLE_APIKEY) {
      logger.error('Please set the GOOGLE_APIKEY environment variable.');
      return;
    }
    this.googleAPIKey = process.env.GOOGLE_APIKEY;
    if (process.env.PEBBLE_API) {
      this.pebbleAPI = process.env.PEBBLE_API;
    }
  }

  async execute(userInput: any): Promise<string> {
    if (!userInput || typeof userInput !== 'object' || !('location' in userInput)) {
      return 'Invalid input. Please provide a text for location address.';
    }
    try {
      let response = await fetch(
        `${this.geocodingAPI}?address=${encodeURIComponent(userInput.location)}&key=${this.googleAPIKey}`,
        {
          signal: AbortSignal.timeout(5000),
        }
      );
      const location = await response.json();
      if (location.status !== 'OK') {
        return 'coding address error. need check google service';
      }
      response = await fetch(
        `${this.pebbleAPI}?lat=${location.results[0].geometry.location.lat}&lon=${location.results[0].geometry.location.lng}`,
        {
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) {
        const errorMessage = `Pebble API request failed with status: ${response.status} ${response.statusText}`;
        return `Pebble API Error: ${errorMessage}`;
      }

      const data = await response.json();
      return `The current temperature in ${userInput} is ${data.temperature} with humidity ${data.humidity}, pressure ${data.pressure}, gas resistance ${data.gasResistance}`;
    } catch (e) {
      logger.error('Error fetch pebble data:', e);
      return 'Could fetch pebble data.';
    }
  }
}
