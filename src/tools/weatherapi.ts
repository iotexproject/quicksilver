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

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.nubila.ai/api/v1/weather";
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

interface ForecastWeatherResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level: number;
      grnd_level: number;
      humidity: number;
      temp_kf: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      "1h": number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export class ForecastWeatherAPITool implements Tool {
  name: string = "ForecastWeatherAPITool";
  description: string =
    "Get weather forecast data from the OpenWeather API. Entering a question containing a city name will return the weather forecast for that city.";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.openweathermap.org/data/2.5/forecast";
  }

  async execute(userInput: any): Promise<string> {
    if (
      !userInput ||
      typeof userInput !== "object" ||
      !("city_name" in userInput)
    ) {
      return "Invalid input. Please provide a JSON object with 'city_name' property.";
    }
    const cityName = userInput.city_name;
    try {
      const response = await fetch(
        `${this.baseUrl}?q=${cityName}&appid=${this.apiKey}`
      );
      const data: ForecastWeatherResponse = await response.json();
      const weatherList = data?.list;
      if (
        !weatherList ||
        !Array.isArray(weatherList) ||
        weatherList.length === 0
      ) {
        return "No available weather data.";
      }
      const summaries = weatherList.map((item) => {
        const date = item.dt_txt; // Use dt_txt for the date
        const temperature = (item.main.temp - 273.15).toFixed(2); // Convert Kelvin to Celsius
        const weatherDescription = item.weather[0].description; // Weather description
        const windSpeed = item.wind.speed; // Wind speed
        return `On ${date}, the temperature is ${temperature}°C, the weather is ${weatherDescription}, and the wind speed is ${windSpeed} m/s.`;
      });
      return `Weather Forecast Data for ${cityName}: ` + summaries.join(" ");
    } catch (error) {
      return "Could not retrieve weather information. Please check the API or your network connection.";
    }
  }
}
