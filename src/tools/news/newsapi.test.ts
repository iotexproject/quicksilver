import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { NewsAPITool } from "./newsapi";

vi.mock("axios");

describe("NewsAPITool", () => {
  let tool: NewsAPITool;
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    // Reset environment and create new tool instance
    process.env.NEWSAPI_API_KEY = mockApiKey;
    tool = new NewsAPITool();
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("NewsAPI");
    expect(tool.description).toBe("Fetches today's headlines from News API");
  });

  it("should return error message when API key is not set", () => {
    delete process.env.NEWSAPI_API_KEY;
    expect(() => new NewsAPITool()).toThrow(
      "Please set the NEWSAPI_API_KEY environment variable.",
    );
  });

  it("should handle successful API response", async () => {
    const mockResponse = {
      data: {
        status: "ok",
        totalResults: 2,
        articles: [
          {
            source: { name: "Test Source 1" },
            title: "Test Title 1",
            url: "https://test1.com",
          },
          {
            source: { name: "Test Source 2" },
            title: "Test Title 2",
            url: "https://test2.com",
          },
        ],
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const result = await tool.execute("any input");

    expect(result).toBe(
      "- [Test Title 1](https://test1.com) - Test Source 1\n" +
        "- [Test Title 2](https://test2.com) - Test Source 2",
    );
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(`apiKey=${mockApiKey}`),
    );
  });

  it("should handle API error response", async () => {
    const mockResponse = {
      data: {
        status: "error",
        code: "apiKeyInvalid",
        message: "Your API key is invalid",
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute("any input");

    expect(result).toBe("Error fetching headlines: error");
    expect(consoleSpy).not.toHaveBeenCalled(); // Error is handled gracefully
  });

  it("should handle network errors", async () => {
    const networkError = new Error("Network error");
    vi.mocked(axios.get).mockRejectedValueOnce(networkError);
    const consoleSpy = vi.spyOn(console, "error");

    const result = await tool.execute("any input");

    expect(result).toBe("Error fetching headlines: Error: Network error");
    expect(consoleSpy).toHaveBeenCalledWith("NewsAPI Error", networkError);
  });

  it("should make request to correct endpoint", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { status: "ok", articles: [] },
    });

    await tool.execute("any input");

    expect(axios.get).toHaveBeenCalledWith(
      "https://newsapi.org/v2/top-headlines?country=us&apiKey=test-api-key",
    );
  });
});
