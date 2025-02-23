import { APITool } from "./tool";
import { formatEther } from "ethers";
import { logger } from "../logger/winston";

const ANALYTICS_API = "https://gateway1.iotex.me/analyzer";
const GQL_ANALYTICS = "https://analyser-api.iotex.io/graphql";

// Types
interface L1Stats {
  tvl: number;
  contracts: number;
  totalStaked: number;
  nodes: number;
  dapps: number;
  crossChainTx: number;
  totalSupply: number;
  totalNumberOfHolders: number;
  totalNumberOfXrc20: number;
  totalNumberOfXrc721: number;
  stakingRatio: number;
  tps: number;
}

interface ChainStats {
  Chain: {
    totalSupply: string;
  };
  TotalNumberOfHolders: {
    totalNumberOfHolders: number;
  };
  XRC20Addresses: {
    count: number;
  };
  XRC721Addresses: {
    count: number;
  };
  MostRecentTPS: {
    mostRecentTPS: number;
  };
}

interface GraphQLResponse {
  data: ChainStats;
}

export class L1DataTool extends APITool<void> {
  constructor() {
    super({
      name: "L1Data",
      description: "Fetches IoTeX L1 chain statistics and metrics",
      output:
        "Chain statistics including TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721",
      baseUrl: ANALYTICS_API,
    });
  }

  async execute(): Promise<string> {
    try {
      const stats = await this.getRawData();
      return JSON.stringify(stats);
    } catch (error) {
      logger.error("L1Data Error:", error);
      return `Error fetching L1 data: ${error}`;
    }
  }

  async getRawData(): Promise<L1Stats> {
    const [
      tvl,
      contracts,
      totalStaked,
      nodes,
      dapps,
      crossChainTx,
      v2ChainStats,
    ] = await Promise.all([
      this.fetchTvl(),
      this.fetchContractsNumber(),
      this.fetchTotalStaked(),
      this.fetchNodesCount(),
      this.fetchDappsCount(),
      this.fetchCrossChainTx(),
      this.fetchAnalyticsV2Stats(),
    ]);

    const [
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      tps,
    ] = this.processV2Stats(v2ChainStats);

    const stakingRatio = this.calcStakingRatio(totalStaked, totalSupply);

    const stats: L1Stats = {
      tvl,
      contracts,
      totalStaked,
      nodes,
      dapps,
      crossChainTx,
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      stakingRatio,
      tps,
    };

    return stats;
  }

  private async fetchTvl(): Promise<number> {
    const res = await this.sendRestRequest("tvl");
    const tvl = await res.text();
    logger.info("tvl", tvl);
    return parseInt(tvl);
  }

  private async fetchContractsNumber(): Promise<number> {
    const res = await this.sendRestRequest("contractCount");
    const contracts = await res.text();
    logger.info("contractCount", contracts);
    return parseInt(contracts);
  }

  private async fetchTotalStaked(): Promise<number> {
    const res = await this.sendRestRequest("totalStakedIotx");
    const totalStaked = await res.text();
    logger.info("totalStakedIotx", totalStaked);
    // @ts-ignore string has replaceAll method
    const withoutQuotes = totalStaked.replaceAll('"', "");
    const value = formatEther(withoutQuotes);
    return Number(value);
  }

  private async fetchNodesCount(): Promise<number> {
    const res = await this.sendRestRequest("nodesCount");
    const nodes = await res.text();
    logger.info("nodesCount", nodes);
    return parseInt(nodes);
  }

  private async fetchDappsCount(): Promise<number> {
    const res = await this.sendRestRequest("dappsCount");
    const dapps = await res.text();
    logger.info("dappsCount", dapps);
    return parseInt(dapps);
  }

  private async fetchCrossChainTx(): Promise<number> {
    const res = await this.sendRestRequest("totalCrossChainTxCount");
    const crossChainTx = await res.text();
    logger.info("totalCrossChainTxCount", crossChainTx);
    return parseInt(crossChainTx);
  }

  private async fetchAnalyticsV2Stats(): Promise<ChainStats> {
    const query = `
      query {
        Chain {
          totalSupply
        }
        TotalNumberOfHolders {
          totalNumberOfHolders
        }
        XRC721Addresses {
          count
        }
        XRC20Addresses {
          count
        }
        MostRecentTPS(blockWindow: 17000) {
          mostRecentTPS
        }
      }
    `;

    const response = await fetch(GQL_ANALYTICS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.API_V2_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const { data } = (await response.json()) as GraphQLResponse;
    return data;
  }

  private async sendRestRequest(path: string): Promise<Response> {
    return fetch(`${ANALYTICS_API}/${path}`);
  }

  private processV2Stats(
    stats: ChainStats,
  ): [number, number, number, number, number] {
    const totalSupply = Number(
      BigInt(stats.Chain.totalSupply) / BigInt("1000000000000000000"),
    );
    const totalNumberOfHolders =
      stats.TotalNumberOfHolders.totalNumberOfHolders;
    const totalNumberOfXrc20 = stats.XRC20Addresses.count;
    const totalNumberOfXrc721 = stats.XRC721Addresses.count;
    const tps = Math.floor(stats.MostRecentTPS.mostRecentTPS * 10000) / 10000;

    return [
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      tps,
    ];
  }

  private calcStakingRatio(totalStaked: number, totalSupply: number): number {
    return totalStaked / totalSupply;
  }

  async parseInput(_: any): Promise<void> {
    return;
  }
}
