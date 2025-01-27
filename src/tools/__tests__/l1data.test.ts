import { describe, it, expect, beforeEach, vi } from "vitest";

import { L1DataTool } from "../l1data";

describe("L1DataTool", () => {
  let l1DataTool: L1DataTool;

  beforeEach(() => {
    l1DataTool = new L1DataTool();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should initialize with correct properties", () => {
    expect(l1DataTool.name).toBe("L1Data");
    expect(l1DataTool.description).toBe(
      "Fetches IoTeX L1 chain statistics and metrics",
    );
  });

  it("should successfully fetch and process L1 data", async () => {
    // Mock all REST API responses
    // @ts-ignore Mock responses don't need full Response implementation
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("1000000") }),
      ) // tvl
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("500") }),
      ) // contracts
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({
          text: () => Promise.resolve("3561284800099304444227406264"),
        }),
      ) // totalStaked
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("100") }),
      ) // nodes
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("200") }),
      ) // dapps
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("1000") }),
      ) // crossChainTx
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
        }),
      );

    const result = await l1DataTool.execute();
    const stats = JSON.parse(result);

    expect(stats).toEqual({
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
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.reject(new Error("Network error")),
    );

    const consoleSpy = vi.spyOn(console, "error");
    const result = await l1DataTool.execute();

    expect(result).toContain("Error fetching L1 data");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should handle GraphQL API errors", async () => {
    // Mock successful REST responses first
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("1000000") }),
      )
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("500") }),
      )
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({
          text: () => Promise.resolve("3561185000099304444227406264"),
        }),
      )
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("100") }),
      )
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("200") }),
      )
      .mockImplementationOnce(() =>
        // @ts-ignore Mock responses don't need full Response implementation
        Promise.resolve({ text: () => Promise.resolve("1000") }),
      )
      // Failed GraphQL response
      .mockImplementationOnce(() => Promise.reject(new Error("GraphQL Error")));

    const consoleSpy = vi.spyOn(console, "error");
    const result = await l1DataTool.execute();

    expect(result).toContain("Error fetching L1 data");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should handle malformed data responses", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        text: () => Promise.resolve("invalid-number"),
      } as Response),
    );

    const consoleSpy = vi.spyOn(console, "error");
    const result = await l1DataTool.execute();

    expect(result).toContain("Error fetching L1 data");
    expect(consoleSpy).toHaveBeenCalled();
  });
});
