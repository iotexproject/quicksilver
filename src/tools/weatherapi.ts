import { Tool } from "./tool";

interface NubilaWeatherData {
  // New interface for the nested data
  temperature: number;
  feels_like?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  condition: string;
  // ... other properties you might need
}

interface NubilaWeatherResponse {
  data: NubilaWeatherData; // The weather data is now under the 'data' property
  ok: boolean;
  // ... other top-level properties if any
}

export class CurrentWeatherAPITool implements Tool {
  name: string = "CurrentWeatherAPITool";
  description: string =
    "Gets the current weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.";
  twitterAccount: string = "nubilanetwork";

  private apiKey: string = process.env.NUBILA_API_KEY!
  private baseUrl: string = "https://api.nubila.ai/api/v1/weather"

  constructor() {
    if (!process.env.NUBILA_API_KEY) {
      console.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }


  async execute(userInput: any): Promise<string> {
    // check user input is json with latitude and longitude
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

      const data: NubilaWeatherResponse = await response.json();

      const weatherData = data.data; // Access the weather data using data.data

      const weatherDescription = weatherData.condition;
      const temperature = weatherData.temperature;
      const feelsLike = weatherData.feels_like
        ? ` (Feels like ${weatherData.feels_like}°C)`
        : "";
      const humidity = weatherData.humidity
        ? ` Humidity: ${weatherData.humidity}%`
        : "";
      const pressure = weatherData.pressure
        ? ` Pressure: ${weatherData.pressure} hPa`
        : "";
      const windSpeed = weatherData.wind_speed
        ? ` Wind Speed: ${weatherData.wind_speed} m/s`
        : "";
      const windDirection = weatherData.wind_direction
        ? ` Wind Direction: ${weatherData.wind_direction}°`
        : "";

      return `The current weather in ${userInput.latitude}, ${userInput.longitude} is ${weatherDescription} with a temperature of ${temperature}°C${feelsLike}.${humidity}${pressure}${windSpeed}${windDirection}`;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return "Could not retrieve weather information. Please check the API or your network connection.";
    }
  }
}

interface NubilaForecastData {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  condition: string;
}

interface NubilaForecastResponse {
  data: NubilaForecastData[];
  ok: boolean;
}

export class ForecastWeatherAPITool implements Tool {
  name: string = "ForecastWeatherAPITool";
  description: string =
    "Get weather forecast data from the Nubila API. Input is json with latitude and longitude to retrieve weather data.";

  private apiKey: string = process.env.NUBILA_API_KEY!
  private baseUrl: string = "https://api.nubila.ai/api/v1/forecast"

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

      const data: NubilaForecastResponse = await response.json();
      const forecastData = data.data;

      if (!forecastData || !Array.isArray(forecastData) || forecastData.length === 0) {
        return "No available weather data.";
      }

      const summaries = forecastData.map((item) => {
        const date = new Date(item.dt * 1000).toLocaleString();
        const temperature = item.temp;
        const condition = item.condition;
        const windSpeed = item.wind_speed;
        return `On ${date}, the temperature is ${temperature}°C, the weather is ${condition}, and the wind speed is ${windSpeed} m/s.`;
      });

      return `Weather Forecast Data for ${userInput.latitude}, ${userInput.longitude}: ` + summaries.join(" ");
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      return "Could not retrieve weather information. Please check the API or your network connection.";
    }
  }
}
