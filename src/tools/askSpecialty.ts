import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";
import { ToolRegistry } from "../registry/registry";
import { LLMService } from "../llm/llm-service";
import { QueryOrchestrator } from "../workflow";
import { logger } from "../logger/winston";
import { ToolName } from "../registry/toolNames";

type DomainConfig = {
  name: string;
  description: string;
  capabilities: string[];
  tools: ToolName[];
};

const domains = new Map<string, DomainConfig>([
  [
    "news",
    {
      name: "News",
      description: "News from the newsapi",
      capabilities: ["news", "top-headlines"],
      tools: [ToolName.NEWS],
    },
  ],
  [
    "environment",
    {
      name: "Environment",
      description: "Weather, climate, and environmental conditions",
      capabilities: ["weather", "forecast"],
      tools: [ToolName.WEATHER_CURRENT, ToolName.WEATHER_FORECAST],
    },
  ],
  [
    "depin",
    {
      name: "DePIN",
      description: "DePIN projects, tokens and metrics",
      capabilities: ["depin", "metrics", "depinscan"],
      tools: [ToolName.DEPIN_METRICS, ToolName.DEPIN_PROJECTS],
    },
  ],
  [
    "iotex",
    {
      name: "IoTeX",
      description: "IoTeX projects and metrics",
      capabilities: ["iotex", "metrics", "l1stats"],
      tools: [ToolName.L1DATA],
    },
  ],
  [
    "gov",
    {
      name: "Government",
      description: "Government data",
      capabilities: ["gov", "nuclear-outages"],
      tools: [ToolName.NUCLEAR],
    },
  ],
  [
    "navigation",
    {
      name: "Navigation",
      description: "Navigation data",
      capabilities: ["navigation", "directions", "geocoding"],
      tools: [ToolName.MAPBOX],
    },
  ],
  [
    "crypto",
    {
      name: "Crypto",
      description: "Crypto data",
      capabilities: [
        "crypto",
        "prices",
        "market-cap",
        "revenue",
        "defi",
        "tokens",
      ],
      tools: [ToolName.CMC, ToolName.DEFILLAMA],
    },
  ],
]);

const generateDescription = (domainMap: Map<string, DomainConfig>): string => {
  const baseDescription =
    "Routes queries to specialized domain agents based on the domain expertise required.";

  const domainDescriptions = Array.from(domainMap.values())
    .map(
      (domain) =>
        `- ${domain.name}: ${domain.description} (${domain.capabilities.join(", ")})`
    )
    .join("\n");

  return `${baseDescription}\n\nAvailable domains and capabilities:\n${domainDescriptions}`;
};

const domainKeys = Array.from(domains.keys()) as [string, ...string[]];

const AskSpecialtyToolSchema = {
  name: "ask_specialty",
  description: generateDescription(domains),
  parameters: z.object({
    domain: z
      .enum(domainKeys)
      .describe(
        `Specific domain to query. Must be one of: ${domainKeys.join(", ")}`
      ),
    question: z.string().describe("The question to ask the specialty agent"),
  }),
  execute: async (args: { domain: string; question: string }) => {
    const tool = new AskSpecialtyTool();
    return tool.execute(args);
  },
};

export class AskSpecialtyTool extends APITool<{
  domain: string;
  question: string;
}> {
  schema = [
    { name: AskSpecialtyToolSchema.name, tool: tool(AskSpecialtyToolSchema) },
  ];

  constructor() {
    super({
      name: AskSpecialtyToolSchema.name,
      description: AskSpecialtyToolSchema.description,
      // Not needed for this tool as it's not making direct API calls
      // But we might extend it to make direct API calls in the future
      baseUrl: "",
    });
  }

  async execute(args: { domain: string; question: string }) {
    try {
      const domain = this.getDomain(args.domain);
      if (typeof domain === "string") {
        return domain;
      }

      const agent = await this.buildSpecialtyAgent(domain);
      if (typeof agent === "string") {
        return agent;
      }

      const response = await agent.process(args.question);

      return {
        domain: args.domain,
        response,
      };
    } catch (error) {
      logger.error("Error executing ask_specialty tool", error);
      return `Error executing ask_specialty tool for domain: ${args.domain}`;
    }
  }

  private getDomain(domain: string): DomainConfig | string {
    const domainConfig = domains.get(domain);
    if (!domainConfig) {
      return `Domain '${domain}' not found. Available domains: ${Array.from(domains.keys()).join(", ")}`;
    }
    return domainConfig;
  }

  private async buildSpecialtyAgent(
    domain: DomainConfig
  ): Promise<QueryOrchestrator | string> {
    const tools = ToolRegistry.getSpecialtyTools(domain.tools);

    if (!tools.length) {
      logger.warn(`No tools found for domain: ${domain.name}`);
      return `No tools available for domain: ${domain.name}`;
    }

    const toolSet = ToolRegistry.buildToolSet(tools);
    return new QueryOrchestrator({
      toolSet,
      llmService: new LLMService({
        fastLLMModel: process.env.FAST_LLM_MODEL,
        LLMModel: process.env.LLM_MODEL,
      }),
    });
  }

  async getRawData() {
    // Not needed for this tool as it's not making direct API calls
    return null;
  }
}
