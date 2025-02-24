import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { NewsAPITool } from "../newsapi";
import { logger } from "../../logger/winston";

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
    expect(tool.description).toBe(
      "Fetches today's headlines from News API with support for filtering by category and keywords",
    );
  });

  it("should return error message when API key is not set", () => {
    delete process.env.NEWSAPI_API_KEY;
    expect(() => new NewsAPITool()).toThrow(
      "Please set the NEWSAPI_API_KEY environment variable.",
    );
  });

  it("should handle network errors", async () => {
    const networkError = new Error("Network error");
    vi.mocked(axios.get).mockRejectedValueOnce(networkError);
    const consoleSpy = vi.spyOn(logger, "error");

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
