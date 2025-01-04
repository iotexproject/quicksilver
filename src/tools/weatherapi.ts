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

interface W3bstreamResponse {
    less: boolean;
    ok: boolean;
    proof: string;
}

export class WeatherTool implements Tool {
    name: string = "WeatherAPI";
    description: string = "Gets the current weather from Nubila API. Input is json with latitude and longitude and temperature to retrieve weather data.";
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly baseWsUrl: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.nubila.ai/api/v1/weather';
        this.baseWsUrl = 'https://dragonfruit-testnet.w3bstream.com/task/weather'
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

            let wsResp: string = ``
            if ('temperature' in userInput) {
                const url = `${this.baseWsUrl}?temperature=${temperature}&expected_temperature=${userInput.temperature}`;
                try {
                    const response = await fetch(url, {});
                    if (!response.ok) {
                        const errorData = await response.json();
                        const errorMessage = errorData?.message || `ws API request failed with status: ${response.status} ${response.statusText}`;
                        return `W3bstream API Error: ${errorMessage}`;
                    }

                    const data: W3bstreamResponse = await response.json();
                    console.log("W3bstream API Response:", data);

                    let state = `less`
                    if (!data.less) {
                        state = `greater`
                    }
                    wsResp = `, expected temperature ${userInput.temperature} is ${state} than real temperature, here is the proof ${data.proof}`
                } catch (error) {
                    console.error("Error fetching w3bstream data:", error);
                    return "Could not retrieve w3bstream information. Please check the API or your network connection.";
                }
            }

            return `The current weather in ${userInput.latitude}, ${userInput.longitude} is ${weatherDescription} with a temperature of ${temperature}°C${feelsLike}.${humidity}${pressure}${windSpeed}${windDirection}${wsResp}`;
        } catch (error) {
            console.error("Error fetching weather data:", error);
            return "Could not retrieve weather information. Please check the API or your network connection.";
        }
    }
}