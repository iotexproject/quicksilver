import { Tool } from './api_tool';

interface NubilaWeatherData { // New interface for the nested data
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

export class WeatherTool implements Tool {
    name: string = "WeatherAPI";
    description: string = "Gets the current weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.";
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.nubila.ai/api/v1/weather';
    }

    async execute(userInput: any): Promise<string> {
        // check user input is json with latitude and longitude
        if (!userInput || typeof userInput !== 'object' || !('latitude' in userInput) || !('longitude' in userInput)) {
            return "Invalid input. Please provide a JSON object with 'latitude' and 'longitude' properties.";
        }

        const url = `${this.baseUrl}?lat=${userInput.latitude}&lon=${userInput.longitude}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.message || `API request failed with status: ${response.status} ${response.statusText}`;
                return `Weather API Error: ${errorMessage}`;
            }

            const data: NubilaWeatherResponse = await response.json();
            console.log("Nubila API Response:", data);

            const weatherData = data.data; // Access the weather data using data.data

            const weatherDescription = weatherData.condition;
            const temperature = weatherData.temperature;
            const feelsLike = weatherData.feels_like ? ` (Feels like ${weatherData.feels_like}°C)` : "";
            const humidity = weatherData.humidity ? ` Humidity: ${weatherData.humidity}%` : "";
            const pressure = weatherData.pressure ? ` Pressure: ${weatherData.pressure} hPa` : "";
            const windSpeed = weatherData.wind_speed ? ` Wind Speed: ${weatherData.wind_speed} m/s` : "";
            const windDirection = weatherData.wind_direction ? ` Wind Direction: ${weatherData.wind_direction}°` : "";


            return `The current weather in ${this.lat}, ${this.lon} is ${weatherDescription} with a temperature of ${temperature}°C${feelsLike}.${humidity}${pressure}${windSpeed}${windDirection}`;
        } catch (error) {
            console.error("Error fetching weather data:", error);
            return "Could not retrieve weather information. Please check the API or your network connection.";
        }
    }
}