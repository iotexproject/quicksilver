import { describe, it, expect, beforeEach, vi } from 'vitest';

import { L1DataTool, GetL1StatsToolSchema, GetL1DailyStatsToolSchema } from '../l1data';

describe('L1DataTool', () => {
  let l1DataTool: L1DataTool;

  beforeEach(() => {
    l1DataTool = new L1DataTool();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should initialize with correct properties', () => {
    expect(l1DataTool.name).toBe('get_l1_stats');
    expect(l1DataTool.description).toBe(
      'Fetches IoTeX L1 chain statistics and metrics: TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721'
    );
    expect(l1DataTool.schema).toHaveLength(2);
    expect(l1DataTool.schema[0].name).toBe('get_l1_stats');
  });

  describe('getRawData', () => {
    it('should successfully fetch and process L1 data', async () => {
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
            text: () => Promise.resolve('1000'),
          })
        ) // crossChainTx - this one doesn't have quotes based on logs
        // GraphQL response
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: {
                  Chain: { totalSupply: '10000000000000000000000000000' },
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

    it('should handle REST API errors', async () => {
      vi.mocked(fetch)
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementation(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            json: () =>
              Promise.resolve({
                data: {
                  Chain: { totalSupply: '10000000000000000000000000000' },
                  TotalNumberOfHolders: { totalNumberOfHolders: 150000 },
                  XRC20Addresses: { count: 300 },
                  XRC721Addresses: { count: 200 },
                  MostRecentTPS: { mostRecentTPS: 25.5 },
                },
              }),
          })
        );

      await expect(l1DataTool.getRawData()).rejects.toThrow('Failed to fetch tvl: Network error');
    });

    it('should handle GraphQL API errors', async () => {
      // Mock successful REST responses first
      vi.mocked(fetch)
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve('1000000') })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve('500') })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({
            text: () => Promise.resolve('3561185000099304444227406264'),
          })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve('100') })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve('200') })
        )
        .mockImplementationOnce(() =>
          // @ts-ignore Mock responses don't need full Response implementation
          Promise.resolve({ text: () => Promise.resolve('1000') })
        )
        // Failed GraphQL response
        .mockImplementationOnce(() => Promise.reject(new Error('GraphQL Error')));

      await expect(l1DataTool.getRawData()).rejects.toThrow('GraphQL Error');
    });

    it('should handle malformed data responses', async () => {
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"invalid-number"'),
        } as Response)
      );

      await expect(l1DataTool.getRawData()).rejects.toThrow();
    });

    it('should correctly parse quoted string responses', async () => {
      // Mock a response with double quotes
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"31946444.838592477"'),
        } as Response)
      );

      // Call the fetchTvl method directly to test parsing
      const result = await l1DataTool['fetchTvl']();

      // Should correctly parse to a number
      expect(result).toBe(31946444.838592477);
    });
  });
});

describe('GetL1StatsToolSchema execute function', () => {
  it('should correctly format the data', async () => {
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
    const getRawDataSpy = vi.spyOn(L1DataTool.prototype, 'getRawData').mockResolvedValue(mockStats);

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

describe('GetL1DailyStatsToolSchema execute function', () => {
  it('should correctly format daily stats data', async () => {
    const mockDailyStats = {
      date: '2024-01-01',
      transactions: 50000,
      tx_volume: 1234567.89,
      sum_gas: 100.5,
      avg_gas: 0.002,
      active_wallets: 1500,
      peak_tps: 45.5,
      tvl: 31946444.838592477,
      holders: 150000,
    };

    // Spy on getDailyData and make it return our mock data
    const getDailyDataSpy = vi.spyOn(L1DataTool.prototype, 'getDailyData').mockResolvedValue(mockDailyStats);

    const result = await GetL1DailyStatsToolSchema.execute({
      date: '2024-01-01',
    });

    expect(result).toEqual({
      ...mockDailyStats,
      tx_volume: 1234567.89,
      sum_gas: 100.5,
      avg_gas: 0.002,
      peak_tps: 45.5,
      currency: {
        tx_volume: 'USD',
        sum_gas: 'IOTX',
        avg_gas: 'IOTX',
        tvl: 'USD',
      },
    });

    expect(getDailyDataSpy).toHaveBeenCalledWith('2024-01-01');
    getDailyDataSpy.mockRestore();
  });

  it('should handle API errors gracefully', async () => {
    const getDailyDataSpy = vi.spyOn(L1DataTool.prototype, 'getDailyData').mockRejectedValue(new Error('API Error'));

    const result = await GetL1DailyStatsToolSchema.execute({
      date: '2024-01-01',
    });
    expect(result).toBe('Error executing get_l1_daily_stats tool');

    getDailyDataSpy.mockRestore();
  });
});

describe('L1DataTool getDailyData', () => {
  let l1DataTool: L1DataTool;

  beforeEach(() => {
    l1DataTool = new L1DataTool();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should fetch and process daily L1 data', async () => {
    // Mock responses for each endpoint
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ tx_count: 50000 }]),
        } as Response)
      ) // transactions
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"1234567.89"'),
        } as Response)
      ) // tx_volume
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"100.5"'),
        } as Response)
      ) // sum_gas
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"0.002"'),
        } as Response)
      ) // avg_gas
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ total: 1500 }]),
        } as Response)
      ) // active_wallets
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ max_tps: '"45.5"' }]),
        } as Response)
      ) // peak_tps
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ tvl: '"31946444.838592477"' }]),
        } as Response)
      ) // tvl
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ holders: 150000 }]),
        } as Response)
      ) // holders
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ avg_staking_duration: 365.5 }]),
        } as Response)
      ); // avg_staking_duration

    const result = await l1DataTool.getDailyData('2024-01-01');

    expect(result).toEqual({
      date: '2024-01-01',
      transactions: 50000,
      tx_volume: 1234567.89,
      sum_gas: 100.5,
      avg_gas: 0.002,
      active_wallets: 1500,
      peak_tps: 45.5,
      tvl: 31946444.838592477,
      holders: 150000,
      avg_staking_duration: 365.5,
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await l1DataTool.getDailyData('2024-01-01');
    expect(result).toStrictEqual({
      date: '2024-01-01',
      transactions: 0,
      tx_volume: 0,
      sum_gas: 0,
      avg_gas: 0,
      active_wallets: 0,
      peak_tps: 0,
      tvl: 0,
      holders: 0,
      avg_staking_duration: 0,
    });
  });

  it('should handle malformed response data', async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ tx_count: 'invalid-number' }]),
      } as Response)
    );

    const result = await l1DataTool.getDailyData('2024-01-01');
    expect(result).toStrictEqual({
      date: '2024-01-01',
      transactions: NaN,
      tx_volume: 0,
      sum_gas: 0,
      avg_gas: 0,
      active_wallets: 0,
      peak_tps: 0,
      tvl: 0,
      holders: 0,
      avg_staking_duration: 0,
    });
  });

  it('should handle empty holders data', async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
    );

    await expect(l1DataTool['fetchDailyHolders']('2024-01-01')).rejects.toThrow(
      'Failed to fetch daily holders: No holders data returned'
    );
  });

  it('should return partial data when some fetches fail', async () => {
    // Mock successful responses for some endpoints and failures for others
    vi.mocked(fetch)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ tx_count: 50000 }]),
        } as Response)
      ) // transactions succeeds
      .mockImplementationOnce(() => Promise.reject(new Error('Network error'))) // tx_volume fails
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('"100.5"'),
        } as Response)
      ) // sum_gas succeeds
      .mockImplementationOnce(() => Promise.reject(new Error('API error'))) // avg_gas fails
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ total: 1500 }]),
        } as Response)
      ) // active_wallets succeeds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ max_tps: '"45.5"' }]),
        } as Response)
      ) // peak_tps succeeds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ tvl: '"31946444.838592477"' }]),
        } as Response)
      ) // tvl succeeds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ holders: 150000 }]),
        } as Response)
      ) // holders succeeds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ avg_staking_duration: 365.5 }]),
        } as Response)
      ); // avg_staking_duration succeeds

    const result = await l1DataTool.getDailyData('2024-01-01');

    // Check that successful fetches returned data
    expect(result.transactions).toBe(50000);
    expect(result.sum_gas).toBe(100.5);
    expect(result.active_wallets).toBe(1500);
    expect(result.peak_tps).toBe(45.5);
    expect(result.tvl).toBe(31946444.838592477);
    expect(result.holders).toBe(150000);
    expect(result.avg_staking_duration).toBe(365.5);

    // Check that failed fetches returned default values
    expect(result.tx_volume).toBe(0);
    expect(result.avg_gas).toBe(0);

    // All fields should be present
    expect(result).toEqual({
      date: '2024-01-01',
      transactions: 50000,
      tx_volume: 0,
      sum_gas: 100.5,
      avg_gas: 0,
      active_wallets: 1500,
      peak_tps: 45.5,
      tvl: 31946444.838592477,
      holders: 150000,
      avg_staking_duration: 365.5,
    });
  });

  it('should return all zero values when all fetches fail', async () => {
    // Mock all endpoints to fail
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error('Network error')));

    const result = await l1DataTool.getDailyData('2024-01-01');

    expect(result).toEqual({
      date: '2024-01-01',
      transactions: 0,
      tx_volume: 0,
      sum_gas: 0,
      avg_gas: 0,
      active_wallets: 0,
      peak_tps: 0,
      tvl: 0,
      holders: 0,
      avg_staking_duration: 0,
    });
  });

  it('should handle empty staking duration data', async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
    );

    const result = await l1DataTool['fetchDailyStakingDuration']('2024-01-01');
    expect(result).toBe(0);
  });
});

describe('GetL1DailyStatsToolSchema date validation', () => {
  it('should reject current date', async () => {
    const currentDate = new Date().toISOString().split('T')[0];

    const res = await GetL1DailyStatsToolSchema.execute({ date: currentDate });
    expect(res).toBe('Error executing get_l1_daily_stats tool');
  });

  it('should reject future date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const res = await GetL1DailyStatsToolSchema.execute({
      date: futureDateStr,
    });
    expect(res).toBe('Error executing get_l1_daily_stats tool');
  });

  it("should accept yesterday's date", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const getDailyDataSpy = vi.spyOn(L1DataTool.prototype, 'getDailyData').mockResolvedValue({
      date: yesterdayStr,
      transactions: 50000,
      tx_volume: 1234567.89,
      sum_gas: 100.5,
      avg_gas: 0.002,
      active_wallets: 1500,
      peak_tps: 45.5,
      tvl: 31946444.838592477,
      holders: 150000,
      avg_staking_duration: 365.5,
    });

    const result = await GetL1DailyStatsToolSchema.execute({
      date: yesterdayStr,
    });
    expect(result).toBeTruthy();
    expect(getDailyDataSpy).toHaveBeenCalledWith(yesterdayStr);

    getDailyDataSpy.mockRestore();
  });

  it('should accept historical date', async () => {
    const pastDate = '2024-01-01';

    const getDailyDataSpy = vi.spyOn(L1DataTool.prototype, 'getDailyData').mockResolvedValue({
      date: pastDate,
      transactions: 50000,
      tx_volume: 1234567.89,
      sum_gas: 100.5,
      avg_gas: 0.002,
      active_wallets: 1500,
      peak_tps: 45.5,
      tvl: 31946444.838592477,
      holders: 150000,
      avg_staking_duration: 365.5,
    });

    const result = await GetL1DailyStatsToolSchema.execute({ date: pastDate });
    expect(result).toBeTruthy();
    expect(getDailyDataSpy).toHaveBeenCalledWith(pastDate);

    getDailyDataSpy.mockRestore();
  });
});
