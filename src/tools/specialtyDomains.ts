import { ToolName } from '../registry/toolNames';

export type DomainConfig = {
  name: string;
  description: string;
  capabilities: string[];
  tools: ToolName[];
};

export enum DomainName {
  NEWS = 'news',
  ENVIRONMENT = 'environment',
  BLOCKCHAIN = 'blockchain',
  FINANCE = 'finance',
  NAVIGATION = 'navigation',
  UTILITY = 'utility',
}

export const domains = new Map<string, DomainConfig>([
  [
    DomainName.NEWS,
    {
      name: 'News',
      description: 'Real-time news and current events coverage',
      capabilities: ['news', 'top-headlines', 'current-events', 'newsapi'],
      tools: [ToolName.NEWS],
    },
  ],
  [
    DomainName.ENVIRONMENT,
    {
      name: 'Environment',
      description: 'Weather, climate, and infrastructure monitoring',
      capabilities: ['weather', 'forecast', 'climate', 'nuclear-outages', 'nubila', 'gov', 'air-quality'],
      tools: [ToolName.WEATHER_CURRENT, ToolName.WEATHER_FORECAST, ToolName.NUCLEAR, ToolName.AIR_QUALITY],
    },
  ],
  [
    DomainName.BLOCKCHAIN,
    {
      name: 'Blockchain',
      description: 'Blockchain networks, DePIN and Web3 metrics',
      capabilities: ['blockchain', 'web3', 'depin', 'metrics', 'l1stats', 'iotex', 'depinscan', 'thirdweb', 'messari'],
      tools: [ToolName.DEPIN_METRICS, ToolName.DEPIN_PROJECTS, ToolName.L1DATA, ToolName.THIRDWEB, ToolName.MESSARI],
    },
  ],
  [
    DomainName.FINANCE,
    {
      name: 'Finance',
      description: 'Cryptocurrency and DeFi market data',
      capabilities: [
        'crypto',
        'defi',
        'prices',
        'market-cap',
        'revenue',
        'tokens',
        'coinmarketcap',
        'defillama',
        'messari',
      ],
      tools: [ToolName.CMC, ToolName.DEFILLAMA, ToolName.TIMESTAMP_CONVERTER, ToolName.DEPIN_NINJA, ToolName.MESSARI],
    },
  ],
  [
    DomainName.NAVIGATION,
    {
      name: 'Navigation',
      description: 'Location services and event information',
      capabilities: ['navigation', 'maps', 'geocoding', 'directions', 'events', 'mapbox', 'luma', 'dimo'],
      tools: [ToolName.MAPBOX, ToolName.LUMA, ToolName.DIMO],
    },
  ],
  [
    DomainName.UTILITY,
    {
      name: 'Utility',
      description:
        "General-purpose utility tools for common operations including mathematical calculations, time conversions, and data formatting. Don't try to make conversions and calculations yourself, use these tools.",
      capabilities: ['math', 'time', 'conversion', 'formatting', 'calculation', 'utility'],
      tools: [ToolName.CALCULATOR, ToolName.TIMESTAMP_CONVERTER],
    },
  ],
]);
