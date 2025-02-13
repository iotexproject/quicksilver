import { Tool } from "../types";
import { NewsAPITool } from "./newsapi";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "./nubila";
import { DePINScanMetricsTool, DePINScanProjectsTool } from "./depinscan";
import { L1DataTool } from "./l1data";
import DimoTool from "./dimo";
import { NuclearOutagesTool } from "./gov";

export class ToolRegistry {
  private static tools = new Map<string, () => Tool>();

  static {
    // Register all available tools
    this.register("news", () => new NewsAPITool());
    this.register("weather-current", () => new CurrentWeatherAPITool());
    this.register("weather-forecast", () => new ForecastWeatherAPITool());
    this.register("depin-metrics", () => new DePINScanMetricsTool());
    this.register("depin-projects", () => new DePINScanProjectsTool());
    this.register("l1data", () => new L1DataTool());
    this.register("dimo", () => new DimoTool());
    this.register("nuclear", () => new NuclearOutagesTool());
  }

  static register(name: string, factory: () => Tool) {
    this.tools.set(name, factory);
  }

  static getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  static getEnabledTools(): Tool[] {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;

    if (!enabledToolsEnv) {
      console.warn(
        "No tools enabled. Please set ENABLED_TOOLS environment variable.",
      );
      return [];
    }

    const enabledTools = enabledToolsEnv.split(",").map((t) => t.trim());

    const invalidTools = enabledTools.filter((tool) => !this.tools.has(tool));
    if (invalidTools.length > 0) {
      console.warn(
        `Warning: Unknown tools configured: ${invalidTools.join(", ")}`,
      );
    }

    return enabledTools
      .map((tool) => {
        try {
          return this.tools.get(tool)!();
        } catch (error) {
          console.error(`Failed to initialize tool ${tool}:`, error);
          return null;
        }
      })
      .filter((tool): tool is Tool => tool !== null);
  }
}
