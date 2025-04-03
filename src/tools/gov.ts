import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

const DateRangeSchema = z
  .object({
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Start date in YYYY-MM-DD format'),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('End date in YYYY-MM-DD format'),
  })
  .refine(data => new Date(data.start) <= new Date(data.end), 'Start date must be before or equal to end date');

const _NuclearOutageDataSchema = z.object({
  period: z.string().describe('The date of the measurement'),
  outage: z.string().describe('Amount of nuclear power plant outage'),
  capacity: z.string().describe('Total nuclear power plant capacity'),
  percentOutage: z.string().describe('Percentage of capacity that is out'),
  'outage-units': z.string().describe('Units for outage measurement'),
  'capacity-units': z.string().describe('Units for capacity measurement'),
  'percentOutage-units': z.string().describe('Units for percentage measurement'),
});

const GetNuclearOutagesToolSchema = {
  name: 'get_nuclear_outages',
  description: 'Fetches nuclear power plant outage data in the United States for a specified date range',
  parameters: z.object({
    dateRange: DateRangeSchema.describe('Date range for fetching nuclear outage data'),
  }),
  execute: async (args: { dateRange: { start: string; end: string } }) => {
    try {
      const tool = new NuclearOutagesTool();
      const data = await tool.getRawData(args.dateRange);

      // Calculate summary statistics
      const outages = data.map(d => parseFloat(d.percentOutage));
      const avgOutage = outages.reduce((a, b) => a + b, 0) / outages.length;
      const maxOutage = Math.max(...outages);
      const minOutage = Math.min(...outages);
      const latestCapacity = parseFloat(data[0].capacity);

      return {
        dateRange: args.dateRange,
        summary: {
          averageOutagePercentage: Number(avgOutage.toFixed(2)),
          maxOutagePercentage: Number(maxOutage.toFixed(2)),
          minOutagePercentage: Number(minOutage.toFixed(2)),
          totalCapacity: Number(latestCapacity.toFixed(2)),
          capacityUnits: data[0]['capacity-units'],
          numberOfDays: data.length,
        },
        dailyData: data.map(d => ({
          date: d.period,
          outagePercentage: Number(parseFloat(d.percentOutage).toFixed(2)),
          capacity: Number(parseFloat(d.capacity).toFixed(2)),
        })),
      };
    } catch (error) {
      logger.error('Error executing get_nuclear_outages tool', error);
      return `Error executing get_nuclear_outages tool`;
    }
  },
};

type DateRange = z.infer<typeof DateRangeSchema>;
type NuclearOutageData = z.infer<typeof _NuclearOutageDataSchema>;

export class NuclearOutagesTool extends APITool<DateRange> {
  schema = [
    {
      name: GetNuclearOutagesToolSchema.name,
      tool: tool(GetNuclearOutagesToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetNuclearOutagesToolSchema.name,
      description: GetNuclearOutagesToolSchema.description,
      baseUrl: 'https://api.eia.gov/v2/nuclear-outages/us-nuclear-outages/data',
      twitterAccount: '@EIAgov',
    });

    if (!process.env.EIA_API_KEY) {
      throw new Error('Missing EIA_API_KEY environment variable');
    }
  }

  async getRawData(params: DateRange): Promise<NuclearOutageData[]> {
    const { start, end } = DateRangeSchema.parse(params);
    const currentDate = new Date();
    const endDate = new Date(end);

    // Ensure end date is not in the future
    if (endDate > currentDate) {
      params.end = currentDate.toISOString().split('T')[0];
    }

    const url = new URL(this.baseUrl);
    const searchParams = new URLSearchParams({
      frequency: 'daily',
      'data[0]': 'outage',
      'data[1]': 'capacity',
      'data[2]': 'percentOutage',
      start,
      end: params.end,
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '5000',
    });

    const response = await fetch(`${url}?${searchParams.toString()}`, {
      headers: {
        'X-Api-Key': process.env.EIA_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.response.data;
  }
}
