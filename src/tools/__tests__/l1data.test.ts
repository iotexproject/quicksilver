import { describe, it, expect, beforeEach, vi } from "vitest";
import { L1DataTool, GetL1StatsToolSchema } from "../l1data";
import { ZodError } from "zod";

describe("L1DataTool", () => {
  let l1DataTool: L1DataTool;

  beforeEach(() => {
    l1DataTool = new L1DataTool();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should initialize with correct properties", () => {
    expect(l1DataTool.name).toBe("get_l1_stats");
    expect(l1DataTool.description).toBe(
      "Fetches IoTeX L1 chain statistics and metrics: TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721"
    );
    expect(l1DataTool.schema).toHaveLength(1);
    expect(l1DataTool.schema[0].name).toBe("get_l1_stats");
  });

  describe("getRawData", () => {
    it("should successfully fetch and process L1 data", async () => {
      // Mock all REST API responses with quoted strings like the real API returns
      // @ts-ignore Mock responses don't need full Response implementation
      vi.mocked(fetch)
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('"1000000"'),
          })
        ) // tvl
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('"500"'),
          })
        ) // contracts
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('"3561284800099304444227406264"'),
          })
        ) // totalStaked
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('"100"'),
          })
        ) // nodes
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve('"200"'),
          })
        ) // dapps
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve("1000"),
          })
        ) // crossChainTx - this one doesn't have quotes based on logs
        // GraphQL response
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: {
                  Chain: { totalSupply: "10000000000000000000000000000" },
                  TotalNumberOfHolders: { totalNumberOfHolders: 150000 },
                  XRC20Addresses: { count: 300 },
                  XRC721Addresses: { count: 200 },
                  MostRecentTPS: { mostRecentTPS: 25.5 },
                },
              }),
          })
        );

      const result = await l1DataTool.getRawData();

      expect(result).toEqual({
        tvl: 1000000,
        contracts: 500,
        totalStaked: 3561284800.099304444227406264,
        nodes: 100,
        dapps: 200,
        crossChainTx: 1000,
        totalSupply: 10000000000,
        totalNumberOfHolders: 150000,
        totalNumberOfXrc20: 300,
        totalNumberOfXrc721: 200,
        stakingRatio: 0.3561284800099304444227406264,
        tps: 25.5,
      });
    });

    it("should handle REST API errors", async () => {
      vi.mocked(fetch)
        .mockImplementationOnce(() =>
          Promise.reject(new Error("Network error"))
        )
        .mockImplementation(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: {
                  Chain: { totalSupply: "10000000000000000000000000000" },
                  TotalNumberOfHolders: { totalNumberOfHolders: 150000 },
                  XRC20Addresses: { count: 300 },
                  XRC721Addresses: { count: 200 },
                  MostRecentTPS: { mostRecentTPS: 25.5 },
                },
              }),
          })
        );

      await expect(l1DataTool.getRawData()).rejects.toThrow(
        "Failed to fetch tvl: Network error"
      );
    });

    it("should handle GraphQL API errors", async () => {
      // Mock successful REST responses first
      vi.mocked(fetch)
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve("1000000") })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve("500") })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            text: () => Promise.resolve("3561185000099304444227406264"),
          })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve("100") })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve("200") })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve("1000") })
        )
        // Failed GraphQL response
        .mockImplementationOnce(() =>
          Promise.reject(new Error("GraphQL Error"))
        );

      await expect(l1DataTool.getRawData()).rejects.toThrow("GraphQL Error");
    });

    it("should handle malformed data responses", async () => {
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"invalid-number"'),
        } as Response)
      );

      await expect(l1DataTool.getRawData()).rejects.toThrow();
    });

    it("should correctly parse quoted string responses", async () => {
      // Mock a response with double quotes
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"31946444.838592477"'),
        } as Response)
      );

      // Call the fetchTvl method directly to test parsing
      const result = await l1DataTool["fetchTvl"]();

      // Should correctly parse to a number
      expect(result).toBe(31946444.838592477);
    });
  });
});

describe("GetL1StatsToolSchema execute function", () => {
  it("should correctly format the data", async () => {
    // Mock getRawData to return a known set of values
    const mockStats = {
      tvl: 31946444.838592477,
      contracts: 13290,
      totalStaked: 3720739446.03,
      nodes: 118,
      dapps: 128,
      crossChainTx: 135821,
      totalSupply: 9441369061,
      totalNumberOfHolders: 744558,
      totalNumberOfXrc20: 3150,
      totalNumberOfXrc721: 549,
      stakingRatio: 0.3941,
      tps: 12.3456,
    };

    // Spy on getRawData and make it return our mock data
    const getRawDataSpy = vi
      .spyOn(L1DataTool.prototype, "getRawData")
      .mockResolvedValue(mockStats);

    // Call the execute function
    const result = await GetL1StatsToolSchema.execute();

    // Verify the formatting is correct
    expect(result).toEqual({
      ...mockStats,
      totalStaked: 3720739446.03, // Should be formatted to 2 decimal places
      stakingRatio: 39.41, // Should be converted to percentage and formatted to 2 decimal places
      tps: 12.3456, // Should be formatted to 4 decimal places
    });

    // Verify getRawData was called
    expect(getRawDataSpy).toHaveBeenCalledTimes(1);

    // Clean up
    getRawDataSpy.mockRestore();
  });
});
