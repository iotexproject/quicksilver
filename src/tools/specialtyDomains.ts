import { ToolName } from "../registry/toolNames";

export type DomainConfig = {
  name: string;
  description: string;
  capabilities: string[];
  tools: ToolName[];
};

export enum DomainName {
  NEWS = "news",
  ENVIRONMENT = "environment",
  BLOCKCHAIN = "blockchain",
  FINANCE = "finance",
  NAVIGATION = "navigation",
}

export const domains = new Map<string, DomainConfig>([
  [
    DomainName.NEWS,
    {
      name: "News",
      description: "Real-time news and current events coverage",
      capabilities: ["news", "top-headlines", "current-events", "newsapi"],
      tools: [ToolName.NEWS],
    },
  ],
  [
    DomainName.ENVIRONMENT,
    {
      name: "Environment",
      description: "Weather, climate, and infrastructure monitoring",
      capabilities: [
        "weather",
        "forecast",
        "climate",
        "nuclear-outages",
        "nubila",
        "gov",
      ],
      tools: [
        ToolName.WEATHER_CURRENT,
        ToolName.WEATHER_FORECAST,
        ToolName.NUCLEAR,
      ],
    },
  ],
  [
    DomainName.BLOCKCHAIN,
    {
      name: "Blockchain",
      description: "Blockchain networks, DePIN and Web3 metrics",
      capabilities: [
        "blockchain",
        "web3",
        "depin",
        "metrics",
        "l1stats",
        "iotex",
        "depinscan",
        "thirdweb",
      ],
      tools: [
        ToolName.DEPIN_METRICS,
        ToolName.DEPIN_PROJECTS,
        ToolName.L1DATA,
        ToolName.THIRDWEB,
      ],
    },
  ],
  [
    DomainName.FINANCE,
    {
      name: "Finance",
      description: "Cryptocurrency and DeFi market data",
      capabilities: [
        "crypto",
        "defi",
        "prices",
        "market-cap",
        "revenue",
        "tokens",
        "coinmarketcap",
        "defillama",
      ],
      tools: [ToolName.CMC, ToolName.DEFILLAMA, ToolName.TIMESTAMP_CONVERTER],
    },
  ],
  [
    DomainName.NAVIGATION,
    {
      name: "Navigation",
      description: "Location services and event information",
      capabilities: [
        "navigation",
        "maps",
        "geocoding",
        "directions",
        "events",
        "mapbox",
        "luma",
        "dimo",
      ],
      tools: [ToolName.MAPBOX, ToolName.LUMA, ToolName.DIMO],
    },
  ],
]);
