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
              owner: "0x264BC41755BA9F5a00DCEC07F96cB14339dBD970",
              tokenId: "24316",
              definition: {
                make: "BMW",
                model: "440i",
                year: "2023",
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
          availableSignals: ["powertrainCombustionEngineSpeed", "powertrainRange", "currentLocationLatitude"],
        },
      })
      .mockResolvedValueOnce({
        data: {
          signalsLatest: {
            powertrainCombustionEngineSpeed: { value: 1168, timestamp: "2025-01-17T16:44:29Z" },
            powertrainRange: { value: 324.21, timestamp: "2025-02-11T10:00:21.56234Z" },
            currentLocationLatitude: { value: 42.5525551, timestamp: "2025-02-11T10:00:21.56234Z" },
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
      const input = "get signals for vehicle 24316";
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"tokenIds": ["24316"], "intermediateResponse": "", "processingRequired": true}</response>',
      );

      const result = await dimoTool.parseInput(input, mockLLMService);
      expect(result).toEqual({
        tokenIds: ["24316"],
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
      const input = "get signals for vehicle 24316";
      (mockLLMService.fastllm.generate as Mock)
        .mockResolvedValueOnce(
          '<response>{"tokenIds": ["24316"], "intermediateResponse": "", "processingRequired": true}</response>',
        )
        .mockResolvedValueOnce("Vehicle 24316 engine speed is 1168rpm, range is 324.21 miles");

      const result = await dimoTool.execute(input, mockLLMService);
      expect(result).toBe("Vehicle 24316 engine speed is 1168rpm, range is 324.21 miles");
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
      const input = "get signals for vehicle 24316";
      (mockLLMService.fastllm.generate as Mock)
        .mockResolvedValueOnce(
          '<response>{"tokenIds": ["24316"], "intermediateResponse": "", "processingRequired": true}</response>',
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
          tokenId: "24316",
          owner: "0x264BC41755BA9F5a00DCEC07F96cB14339dBD970",
          definition: {
            make: "BMW",
            model: "440i", 
            year: "2023",
          },
        },
      ];

      const formatted = dimoTool["formatAccessibleVehicles"](vehicles);
      expect(formatted).toBe("24316 - BMW 440i 2023");
    });

    it("should build latest signals query correctly", () => {
      const tokenId = "24316";
      const signals = ["powertrainCombustionEngineSpeed", "powertrainRange"];
      const query = dimoTool["buildLatestSignalsQuery"](tokenId, signals);
      expect(query).toContain("signalsLatest(tokenId: 24316)");
      expect(query).toContain("powertrainCombustionEngineSpeed {");
      expect(query).toContain("powertrainRange {");
    });
  });
});
