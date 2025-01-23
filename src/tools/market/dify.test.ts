import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { DePINTool } from "./dify";
import { handleStreamResponse } from "../../utils/stream_utils";

vi.mock("axios");
vi.mock("../../utils/stream_utils", () => ({
  handleStreamResponse: vi.fn(),
}));

describe("DePINTool", () => {
  let tool: DePINTool;
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    process.env.DEPIN_API_KEY = mockApiKey;
    tool = new DePINTool();
    vi.clearAllMocks();
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("DePIN Tool");
    expect(tool.description).toContain(
      "A tool for querying DePIN project token",
    );
    expect(tool.baseUrl).toBe("https://dify.iotex.one/v1");
  });

  it.skip("should return error message when API key is not set", () => {
    delete process.env.DEPIN_API_KEY;
    expect(() => new DePINTool()).toThrow(
      "Please set the DEPIN_API_KEY environment variable.",
    );
  });

  describe("execute", () => {
    it("should make correct API call", async () => {
      const mockInput = "How many dimo vehicles?";
      const mockResponse = { data: "stream" };
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);
      vi.mocked(handleStreamResponse).mockImplementationOnce((_, onData) => {
        onData("There are 1000 dimo vehicles");
        return Promise.resolve(undefined);
      });

      const result = await tool.execute(mockInput);

      expect(result).toBe("There are 1000 dimo vehicles");
      expect(axios.post).toHaveBeenCalledWith(
        "https://dify.iotex.one/v1/chat-messages",
        {
          inputs: {},
          query: mockInput,
          response_mode: "streaming",
          conversation_id: "",
          user: "quicksilver-user",
        },
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );
    });

    it("should handle API error", async () => {
      const mockError = new Error("API Error");
      vi.mocked(axios.post).mockRejectedValueOnce(mockError);
      const consoleSpy = vi.spyOn(console, "error");

      await expect(tool.execute("test query")).rejects.toThrow("API Error");
      expect(consoleSpy).toHaveBeenCalledWith(
        "DifyTool Streaming Error:",
        mockError.message,
      );
    });

    it("should handle streaming error with callback", async () => {
      const mockError = new Error("Streaming Error");
      vi.mocked(axios.post).mockResolvedValueOnce({ data: "stream" });
      vi.mocked(handleStreamResponse).mockRejectedValueOnce(mockError);

      const consoleSpy = vi.spyOn(console, "error");
      await expect(tool.execute("test query")).rejects.toThrow(
        "Streaming Error",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "DifyTool Streaming Error:",
        mockError.message,
      );
    });
  });

  describe("parseInput", () => {
    it("should pass through input unchanged", async () => {
      const input = "test input";
      const result = await tool.parseInput(input);
      expect(result).toBe(input);
    });
  });
});
