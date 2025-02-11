import { describe, vi, beforeEach, it, expect, Mock } from "vitest";
import { DimoTool } from "../dimo";
import { LLMService } from "../../services/llm-service";

// Mock environment variables
const mockEnv = {
  CLIENT_ID: "test-client-id",
  REDIRECT_URI: "test-domain",
  API_KEY: "test-private-key",
  PRIVILEGED_ADDRESS: "0x123",
};

describe("DimoTool", () => {
  let dimoTool: DimoTool;
  let mockLLMService: LLMService;

  beforeEach(() => {
    // Setup environment variables
    process.env = { ...process.env, ...mockEnv };

    dimoTool = new DimoTool();
    const generateMock = vi.fn() as Mock;
    mockLLMService = {
      fastLLMProvider: "test-provider",
      llmProvider: "test-provider",
      fastllm: {
        generate: generateMock,
      },
      llm: {
        generate: vi.fn(),
      },
      initLLM: vi.fn(),
    } as unknown as LLMService;

    // Mock DIMO SDK methods
    vi.spyOn(dimoTool["dimo"].identity, "query").mockResolvedValue({
      data: {
        vehicles: {
          nodes: [
            {
              owner: "0x123",
              tokenId: "456",
              definition: {
                make: "Tesla",
                model: "Model 3",
                year: "2021",
              },
            },
          ],
        },
      },
    });

    vi.spyOn(dimoTool["dimo"].auth, "getToken").mockResolvedValue({
      token: "dev-jwt-token",
    });

    vi.spyOn(dimoTool["dimo"].tokenexchange, "exchange").mockResolvedValue({
      token: "vehicle-jwt-token",
    });

    vi.spyOn(dimoTool["dimo"].telemetry, "query")
      .mockResolvedValueOnce({
        data: {
          availableSignals: ["speed", "battery", "location"],
        },
      })
      .mockResolvedValueOnce({
        data: {
          signalsLatest: {
            speed: { value: 60, timestamp: "2024-03-20T12:00:00Z" },
            battery: { value: 80, timestamp: "2024-03-20T12:00:00Z" },
            location: { value: "123,456", timestamp: "2024-03-20T12:00:00Z" },
          },
        },
      });
  });

  describe("constructor", () => {
    it("should throw error if environment variables are missing", () => {
      process.env = {};
      expect(() => new DimoTool()).toThrow(
        "Missing one of the following environment variables",
      );
    });

    it("should initialize with correct environment variables", () => {
      expect(() => new DimoTool()).not.toThrow();
    });
  });

  describe("parseInput", () => {
    it("should parse input with token IDs", async () => {
      const input = "get signals for vehicle 456";
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"tokenIds": ["456"], "intermediateResponse": "", "processingRequired": true}</response>',
      );

      const result = await dimoTool.parseInput(input, mockLLMService);
      expect(result).toEqual({
        tokenIds: ["456"],
        intermediateResponse: "",
        processingRequired: true,
      });
    });

    it("should handle input without token IDs", async () => {
      const input = "list all vehicles";
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"tokenIds": [], "intermediateResponse": "Here are all accessible vehicles:", "processingRequired": false}</response>',
      );

      const result = await dimoTool.parseInput(input, mockLLMService);
      expect(result).toEqual({
        tokenIds: [],
        intermediateResponse: "Here are all accessible vehicles:",
        processingRequired: false,
      });
    });

    it("should handle invalid response format", async () => {
      const input = "invalid query";
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        "invalid response",
      );

      const result = await dimoTool.parseInput(input, mockLLMService);
      expect(result).toEqual({
        tokenIds: [],
        intermediateResponse: "invalid response",
      });
    });
  });

  describe("execute", () => {
    it("should execute query for specific vehicle", async () => {
      const input = "get signals for vehicle 456";
      (mockLLMService.fastllm.generate as Mock)
        .mockResolvedValueOnce(
          '<response>{"tokenIds": ["456"], "intermediateResponse": "", "processingRequired": true}</response>',
        )
        .mockResolvedValueOnce("Vehicle 456 speed is 60mph, battery is at 80%");

      const result = await dimoTool.execute(input, mockLLMService);
      expect(result).toBe("Vehicle 456 speed is 60mph, battery is at 80%");
      expect(dimoTool["dimo"].telemetry.query).toHaveBeenCalled();
    });

    it("should handle query without specific vehicle", async () => {
      const input = "list all vehicles";
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"tokenIds": [], "intermediateResponse": "Here are all accessible vehicles:", "processingRequired": false}</response>',
      );

      const result = await dimoTool.execute(input, mockLLMService);
      expect(result).toBe("Here are all accessible vehicles:");
      expect(dimoTool["dimo"].identity.query).toHaveBeenCalled();
    });

    it("should handle errors in vehicle signal fetching", async () => {
      const input = "get signals for vehicle 456";
      (mockLLMService.fastllm.generate as Mock)
        .mockResolvedValueOnce(
          '<response>{"tokenIds": ["456"], "intermediateResponse": "", "processingRequired": true}</response>',
        )
        .mockResolvedValueOnce("No data available");

      vi.spyOn(dimoTool["dimo"].telemetry, "query").mockRejectedValueOnce(
        new Error("Failed to fetch signals"),
      );

      const result = await dimoTool.execute(input, mockLLMService);
      expect(result).toBe("No data available");
    });
  });

  describe("private methods", () => {
    it("should format accessible vehicles correctly", async () => {
      const vehicles = [
        {
          tokenId: "456",
          owner: "0x123",
          definition: {
            make: "Tesla",
            model: "Model 3",
            year: "2021",
          },
        },
      ];

      const formatted = dimoTool["formatAccessibleVehicles"](vehicles);
      expect(formatted).toBe("456 - Tesla Model 3 2021");
    });

    it("should build latest signals query correctly", () => {
      const tokenId = "456";
      const signals = ["speed", "battery"];
      const query = dimoTool["buildLatestSignalsQuery"](tokenId, signals);
      expect(query).toContain("signalsLatest(tokenId: 456)");
      expect(query).toContain("speed {");
      expect(query).toContain("battery {");
    });
  });
});
