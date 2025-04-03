import { z } from 'zod';
import { tool } from 'ai';
import { APITool } from './tool';
import { logger } from '../logger/winston';

const TimestampUnitSchema = z.enum(['ms', 'sec']).describe('Unit of the timestamp (milliseconds or seconds)');

const TimestampConverterToolSchema = {
  name: 'convert_timestamp',
  description: 'Converts timestamps between ISO strings and numeric values (milliseconds or seconds)',
  parameters: z.object({
    value: z.union([z.string(), z.number()]).describe('Timestamp value to convert (ISO string or numeric)'),
    targetUnit: TimestampUnitSchema.optional().describe(
      'Target unit for conversion (ms or sec). Required only when converting from ISO string'
    ),
  }),
  execute: async (args: { value: string | number; targetUnit?: 'ms' | 'sec' }) => {
    const tool = new TimestampConverterTool();
    return tool.execute(args);
  },
};

export class TimestampConverterTool extends APITool<{
  value: string | number;
  targetUnit?: 'ms' | 'sec';
}> {
  schema = [
    {
      name: TimestampConverterToolSchema.name,
      tool: tool(TimestampConverterToolSchema),
    },
  ];

  constructor() {
    super({
      name: TimestampConverterToolSchema.name,
      description: TimestampConverterToolSchema.description,
      baseUrl: '',
    });
  }

  async execute(args: { value: string | number; targetUnit?: 'ms' | 'sec' }) {
    return this.withErrorHandling('convert_timestamp', async () => {
      const { value, targetUnit } = args;

      if (typeof value === 'string') {
        return this.convertFromISO(value, targetUnit);
      } else {
        return this.convertToISO(value);
      }
    });
  }

  private convertFromISO(isoString: string, targetUnit: 'ms' | 'sec' | undefined): string {
    if (!targetUnit) {
      throw new Error('Target unit is required when converting from ISO string');
    }

    const timestamp = new Date(isoString).getTime();

    if (isNaN(timestamp)) {
      throw new Error('Timestamp is NaN');
    }

    return targetUnit === 'sec' ? Math.floor(timestamp / 1000).toString() : timestamp.toString();
  }

  getRawData(args: { value: string | number; targetUnit?: 'ms' | 'sec' }) {
    return this.execute(args);
  }

  private convertToISO(timestamp: number): string {
    // Determine if timestamp is in seconds or milliseconds
    const isSeconds = timestamp.toString().length <= 10;
    const msTimestamp = isSeconds ? timestamp * 1000 : timestamp;

    return new Date(msTimestamp).toISOString();
  }

  private async withErrorHandling<T>(operation: string, action: () => Promise<T>): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }
}
