import { describe, vi, beforeEach, it, expect } from "vitest";

import { DimoTool } from "../dimo";

const mockEnv = {
  CLIENT_ID: "test-client-id",
  REDIRECT_URI: "test-domain",
  API_KEY: "test-private-key",
  PRIVILEGED_ADDRESS: "0x123",
};

describe("DimoTool", () => {
  let dimoTool: DimoTool;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    dimoTool = new DimoTool();

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
          availableSignals: [
            "powertrainCombustionEngineSpeed",
            "powertrainRange",
            "currentLocationLatitude",
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          signalsLatest: {
            powertrainCombustionEngineSpeed: {
              value: 1168,
              timestamp: "2025-01-17T16:44:29Z",
            },
            powertrainRange: {
              value: 324.21,
              timestamp: "2025-02-11T10:00:21.56234Z",
            },
            currentLocationLatitude: {
              value: 42.5525551,
              timestamp: "2025-02-11T10:00:21.56234Z",
            },
          },
        },
      });
  });

  describe("constructor", () => {
    it("should throw error if environment variables are missing", () => {
      process.env = {};
      expect(() => new DimoTool()).toThrow(
        "Missing one of the following environment variables"
      );
    });

    it("should initialize with correct properties", () => {
      expect(dimoTool.name).toBe("DIMO");
      expect(dimoTool.description).toContain(
        "Tool for interacting with personal vehicles data and signals"
      );
      expect(dimoTool.twitterAccount).toBe("@DIMO_Network");
      expect(dimoTool.schema).toHaveLength(3);
      expect(dimoTool.schema[0].name).toBe("list_vehicles");
      expect(dimoTool.schema[1].name).toBe("get_vehicle_signals");
      expect(dimoTool.schema[2].name).toBe("get_latest_signals");
    });
  });

  describe("getRawData", () => {
    it("should list vehicles when no tokenId provided", async () => {
      const result = await dimoTool.getRawData({});

      expect(result).toEqual([
        {
          owner: "0x264BC41755BA9F5a00DCEC07F96cB14339dBD970",
          tokenId: "24316",
          definition: {
            make: "BMW",
            model: "440i",
            year: "2023",
          },
        },
      ]);
      expect(dimoTool["dimo"].identity.query).toHaveBeenCalled();
    });

    it("should get available signals when only tokenId provided", async () => {
      const result = await dimoTool.getRawData({ tokenId: "24316" });

      expect(result).toEqual({
        availableSignals: [
          "powertrainCombustionEngineSpeed",
          "powertrainRange",
          "currentLocationLatitude",
        ],
      });
      expect(dimoTool["dimo"].auth.getToken).toHaveBeenCalled();
      expect(dimoTool["dimo"].tokenexchange.exchange).toHaveBeenCalled();
      expect(dimoTool["dimo"].telemetry.query).toHaveBeenCalled();
    });

    it("should get latest signals when tokenId and signals provided", async () => {
      vi.spyOn(dimoTool["dimo"].telemetry, "query").mockResolvedValue({
        data: {
          signalsLatest: {
            powertrainCombustionEngineSpeed: {
              value: 1168,
              timestamp: "2025-01-17T16:44:29Z",
            },
            powertrainRange: {
              value: 324.21,
              timestamp: "2025-02-11T10:00:21.56234Z",
            },
            currentLocationLatitude: {
              value: 42.5525551,
              timestamp: "2025-02-11T10:00:21.56234Z",
            },
          },
        },
      });
      const result = await dimoTool.getRawData({
        tokenId: "24316",
        signals: ["powertrainCombustionEngineSpeed", "powertrainRange"],
      });

      expect(result).toEqual([
        {
          tokenId: "24316",
          latestSignals: {
            signalsLatest: {
              powertrainCombustionEngineSpeed: {
                value: 1168,
                timestamp: "2025-01-17T16:44:29Z",
              },
              powertrainRange: {
                value: 324.21,
                timestamp: "2025-02-11T10:00:21.56234Z",
              },
              currentLocationLatitude: {
                value: 42.5525551,
                timestamp: "2025-02-11T10:00:21.56234Z",
              },
            },
          },
        },
      ]);
      expect(dimoTool["dimo"].auth.getToken).toHaveBeenCalled();
      expect(dimoTool["dimo"].tokenexchange.exchange).toHaveBeenCalled();
      expect(dimoTool["dimo"].telemetry.query).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      vi.spyOn(dimoTool["dimo"].telemetry, "query").mockRejectedValueOnce(
        new Error("Network error")
      );

      await expect(
        dimoTool.getRawData({
          tokenId: "24316",
          signals: ["powertrainCombustionEngineSpeed"],
        })
      ).rejects.toThrow("Network error");
    });
  });

  describe("utility methods", () => {
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
