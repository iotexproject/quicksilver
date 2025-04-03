import { ToolSet } from 'ai';

import { logger } from '../logger/winston';
import { QSTool } from '../types';
import { availableTools } from './toolClasses';
import { ToolName } from './toolNames';

export class ToolRegistry {
  private static tools = new Map<ToolName, () => QSTool>();

  static {
    availableTools.forEach(tool => {
      this.register(tool.name, () => new tool.toolClass());
    });
  }

  static register(name: ToolName, factory: () => QSTool): void {
    this.tools.set(name, factory);
  }

  static getAvailableTools(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  static getEnabledTools(): QSTool[] {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;

    if (!enabledToolsEnv) {
      logger.warn('No tools enabled. Please set ENABLED_TOOLS environment variable.');
      return [];
    }

    const enabledTools = enabledToolsEnv.split(',').map(t => t.trim() as ToolName);

    const invalidTools = enabledTools.filter(tool => !this.tools.has(tool));
    if (invalidTools.length > 0) {
      logger.warn(`Warning: Unknown tools configured: ${invalidTools.join(', ')}`);
    }

    return enabledTools.map(tool => this.getTool(tool)).filter((tool): tool is QSTool => tool !== undefined);
  }

  static getSpecialtyTools(toolNames: ToolName[]): QSTool[] {
    return toolNames.map(toolName => this.getTool(toolName)).filter((tool): tool is QSTool => tool !== undefined);
  }

  static getTool(name: ToolName): QSTool | undefined {
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

  static isEnabled(name: ToolName): boolean {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;
    if (!enabledToolsEnv) {
      return false;
    }
    return enabledToolsEnv
      .split(',')
      .map(t => t.trim())
      .includes(name);
  }

  static buildToolSet(tools: QSTool[]): ToolSet {
    const toolSet: ToolSet = {};
    tools.forEach(tool => {
      tool.schema.forEach(schema => {
        toolSet[schema.name] = schema.tool;
      });
    });
    return toolSet;
  }
}
