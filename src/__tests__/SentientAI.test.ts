import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SentientAI } from '../sentientAI';

const currentWeatherOutput = `
<response>
["get_current_weather"]
</response>
`;

describe('SentientAI', () => {
  beforeEach(() => {
    process.env.FAST_LLM_MODEL = 'test-fast-model';
    process.env.LLM_MODEL = 'test-model';

    vi.mock('../llm/llm-service', () => ({
      LLMService: vi.fn().mockImplementation(() => ({
        fastllm: {
          generate: vi.fn().mockResolvedValue(currentWeatherOutput),
        },
        llm: {
          generate: vi.fn().mockResolvedValue('+10 C'),
        },
      })),
    }));
    vi.mock('../tools/weather/nubila', () => ({
      CurrentWeatherAPITool: vi.fn().mockImplementation(() => ({
        name: 'get_current_weather',
        description:
          'Gets the current weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.',
        twitterAccount: 'nubilanetwork',
      })),
      ForecastWeatherAPITool: vi.fn().mockImplementation(() => ({
        name: 'ForecastWeatherAPITool',
        description:
          'Gets the forecast weather from Nubila API. Input is json with latitude and longitude to retrieve weather data.',
      })),
    }));
    vi.mock('../raw-data-provider', () => ({
      RawDataProvider: vi.fn().mockImplementation(() => ({
        process: vi.fn().mockImplementation(tool => {
          if (tool.name === 'get_current_weather') {
            return Promise.resolve('+10 C');
          }
          return Promise.reject(new Error(`Unknown tool ${tool.name}`));
        }),
      })),
    }));
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.FAST_LLM_MODEL;
    delete process.env.LLM_MODEL;
    delete process.env.FAST_LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    vi.clearAllMocks();
  });

  it('should throw if FAST_LLM_MODEL is not set', () => {
    delete process.env.FAST_LLM_MODEL;
    expect(() => new SentientAI()).toThrow('FAST_LLM_MODEL and LLM_MODEL must be set');
  });

  it('should throw if LLM_MODEL is not set', () => {
    delete process.env.LLM_MODEL;
    expect(() => new SentientAI()).toThrow('FAST_LLM_MODEL and LLM_MODEL must be set');
  });

  it('should throw if both models are not set', () => {
    delete process.env.FAST_LLM_MODEL;
    delete process.env.LLM_MODEL;
    expect(() => new SentientAI()).toThrow('FAST_LLM_MODEL and LLM_MODEL must be set');
  });

  it('should return a response', async () => {
    process.env.ENABLED_TOOLS = 'weather-current';
    const sentai = new SentientAI();
    const response = await sentai.execute('Current temperature in SF?');
    expect(response).toBe('+10 C');
  });

  describe('getRawData', () => {
    it('should return raw data for an enabled tool', async () => {
      const sentai = new SentientAI();
      const params = { latitude: 37.7749, longitude: -122.4194 };
      const result = await sentai.getRawData('weather-current', params);
      expect(result).toBe('+10 C');
    });

    it('should throw when tool is not found', async () => {
      process.env.ENABLED_TOOLS = 'weather-current';
      const sentai = new SentientAI();
      await expect(sentai.getRawData('non-existent-tool', {})).rejects.toThrow("Tool 'non-existent-tool' not found");
    });
  });
});
