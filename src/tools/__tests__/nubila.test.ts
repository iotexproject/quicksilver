import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ZodError } from 'zod';

import { CurrentWeatherAPITool, ForecastWeatherAPITool } from '../nubila';

describe('CurrentWeatherAPITool', () => {
  let tool: CurrentWeatherAPITool;
  let mockFetch: any;

  const mockWeatherAPIResponse = (response: any) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });
  };

  const originalEnv = process.env.NUBILA_API_KEY;

  beforeEach(() => {
    process.env.NUBILA_API_KEY = 'test-api-key';
    tool = new CurrentWeatherAPITool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env.NUBILA_API_KEY = originalEnv;
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('get_current_weather');
    expect(tool.description).toContain('Gets the current weather conditions for a specific location');
    expect(tool.twitterAccount).toBe('nubilanetwork');
    expect(tool.schema).toHaveLength(1);
    expect(tool.schema[0].name).toBe('get_current_weather');
  });

  it('should return error message when API key is not set', () => {
    delete process.env.NUBILA_API_KEY;
    expect(() => new CurrentWeatherAPITool()).toThrow('NUBILA_API_KEY environment variable is required');
  });

  it('should handle successful API response', async () => {
    const mockWeatherData = {
      data: {
        condition: 'Sunny',
        temperature: 25,
        feels_like: 27,
        humidity: 60,
        pressure: 1013,
        wind_speed: 5,
        wind_direction: 180,
        uv: 5,
        luminance: 50000,
        elevation: 100,
        rain: 0,
        wet_bulb: 20,
        location_name: 'San Francisco',
      },
    };

    mockWeatherAPIResponse(mockWeatherData);

    const result = await tool.getRawData({
      lat: 37.7749,
      lon: -122.4194,
    });

    expect(result).toEqual(mockWeatherData.data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('lat=37.7749&lon=-122.4194'),
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      tool.getRawData({
        lat: 37.7749,
        lon: -122.4194,
      })
    ).rejects.toThrow('Weather API Error: API request failed with status: 404 Not Found');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      tool.getRawData({
        lat: 37.7749,
        lon: -122.4194,
      })
    ).rejects.toThrow('Network error');
  });

  it('should handle malformed API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // Missing data property
    });

    const result = await tool.getRawData({
      lat: 37.7749,
      lon: -122.4194,
    });

    expect(result).toBeUndefined();
  });
});

describe('ForecastWeatherAPITool', () => {
  let tool: ForecastWeatherAPITool;
  let mockFetch: any;

  beforeEach(() => {
    process.env.NUBILA_API_KEY = 'test-api-key';
    tool = new ForecastWeatherAPITool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('get_forecast_weather');
    expect(tool.description).toContain('Gets the weather forecast for a specific location');
    expect(tool.twitterAccount).toBe('nubilanetwork');
    expect(tool.schema).toHaveLength(1);
    expect(tool.schema[0].name).toBe('get_forecast_weather');
  });

  it('should return error message when API key is not set', () => {
    delete process.env.NUBILA_API_KEY;
    expect(() => new ForecastWeatherAPITool()).toThrow('NUBILA_API_KEY environment variable is required');
  });

  it('should handle successful API response', async () => {
    const mockForecastData = {
      data: [
        {
          timestamp: 1234567890,
          temperature: 25,
          condition: 'Clear',
          condition_desc: 'Sunny',
          wind_speed: 5,
          pressure: 1013,
          humidity: 60,
          uv: 5,
          luminance: 50000,
          rain: 0,
          wet_bulb: 20,
          location_name: 'San Francisco',
        },
        {
          timestamp: 1234571490,
          temperature: 23,
          condition: 'Clouds',
          condition_desc: 'Cloudy',
          wind_speed: 6,
          pressure: 1015,
          humidity: 65,
          uv: 3,
          luminance: 30000,
          rain: 0,
          wet_bulb: 19,
          location_name: 'San Francisco',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockForecastData),
    });

    const result = await tool.getRawData({
      lat: 37.7749,
      lon: -122.4194,
    });

    expect(result).toEqual(mockForecastData.data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('lat=37.7749&lon=-122.4194'),
      expect.objectContaining({
        headers: { 'x-api-key': 'test-api-key' },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      tool.getRawData({
        lat: 37.7749,
        lon: -122.4194,
      })
    ).rejects.toThrow('Weather API Error: API request failed with status: 404 Not Found');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      tool.getRawData({
        lat: 37.7749,
        lon: -122.4194,
      })
    ).rejects.toThrow('Network error');
  });
});

describe('BaseWeatherAPITool', () => {
  let tool: CurrentWeatherAPITool;
  let mockFetch: any;

  beforeEach(() => {
    process.env.NUBILA_API_KEY = 'test-api-key';
    tool = new CurrentWeatherAPITool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('getRawData', () => {
    it('should throw error when latitude or longitude is missing', async () => {
      const invalidCoords = { lat: undefined, lon: -122.4194 };
      // @ts-ignore: check the behavior in runtime
      await expect(tool.getRawData(invalidCoords)).rejects.toEqual(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'undefined',
            path: ['lat'],
            message: 'Required',
          },
        ])
      );

      const invalidCoords2 = { lat: 37.7749, lon: undefined };
      // @ts-ignore: check the behavior in runtime
      await expect(tool.getRawData(invalidCoords2)).rejects.toEqual(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'undefined',
            path: ['lon'],
            message: 'Required',
          },
        ])
      );
    });

    it('should make API request with correct parameters', async () => {
      const coords = { lat: 37.7749, lon: -122.4194 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await tool.getRawData(coords);

      expect(mockFetch).toHaveBeenCalledWith(`${tool.baseUrl}?lat=37.7749&lon=-122.4194`, {
        headers: { 'x-api-key': 'test-api-key' },
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle malformed API response', async () => {
      const coords = { lat: 37.7749, lon: -122.4194 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Missing data property
      });

      const result = await tool.getRawData(coords);
      expect(result).toBeUndefined();
    });

    it('should handle string values for latitude and longitude', async () => {
      // @ts-ignore: Testing runtime behavior with string values
      const coords = { lat: '37.7749', lon: '-122.4194' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { temperature: 25 } }),
      });

      // @ts-ignore: Testing runtime behavior with string values
      await tool.getRawData(coords);

      expect(mockFetch).toHaveBeenCalledWith(`${tool.baseUrl}?lat=37.7749&lon=-122.4194`, {
        headers: { 'x-api-key': 'test-api-key' },
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle string values with invalid numbers', async () => {
      // @ts-ignore: Testing runtime behavior with invalid string values
      const coords = { lat: 'invalid', lon: '-122.4194' };

      // @ts-ignore: Testing runtime behavior with invalid string values
      await expect(tool.getRawData(coords)).rejects.toEqual(
        expect.objectContaining({
          name: 'ZodError',
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: 'invalid_type',
              path: ['lat'],
            }),
          ]),
        })
      );
    });
  });
});
