import { QSTool } from "../types";
import { NewsAPITool } from "./newsapi";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "./nubila";
import { DePINScanMetricsTool, DePINScanProjectsTool } from "./depinscan";
import { L1DataTool } from "./l1data";
import DimoTool from "./dimo";
import { NuclearOutagesTool } from "./gov";
import { logger } from "../logger/winston";
import { MapboxTool } from "./mapbox";
import { ETHDenverTool } from "./ethdenver";
import LumaEventsTool from "./luma";
export class ToolRegistry {
  private static tools = new Map<string, () => QSTool>();

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
    this.register("mapbox", () => new MapboxTool());
    this.register("ethdenver", () => new ETHDenverTool());
    this.register("luma", () => new LumaEventsTool());
  }

  static register(name: string, factory: () => QSTool) {
    this.tools.set(name, factory);
  }

  static getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  static getEnabledTools(): QSTool[] {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;

    if (!enabledToolsEnv) {
      logger.warn(
        "No tools enabled. Please set ENABLED_TOOLS environment variable."
      );
      return [];
    }

    const enabledTools = enabledToolsEnv.split(",").map((t) => t.trim());

    const invalidTools = enabledTools.filter((tool) => !this.tools.has(tool));
    if (invalidTools.length > 0) {
      logger.warn(
        `Warning: Unknown tools configured: ${invalidTools.join(", ")}`
      );
    }

    return enabledTools
      .map((tool) => {
        try {
          return this.tools.get(tool)!();
        } catch (error) {
          logger.error(`Failed to initialize tool ${tool}:`, error);
          return null;
        }
      })
      .filter((tool): tool is QSTool => tool !== null);
  }

  static getTool(name: string): QSTool | undefined {
    const tool = this.tools.get(name);
    if (!tool) {
      return undefined;
    }
    try {
      return tool();
    } catch (error) {
      logger.error(`Failed to initialize tool ${name}:`, error);
      return undefined;
    }
  }

  static isEnabled(name: string): boolean {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;
    if (!enabledToolsEnv) {
      return false;
    }
    return enabledToolsEnv
      .split(",")
      .map((t) => t.trim())
      .includes(name);
  }
}
