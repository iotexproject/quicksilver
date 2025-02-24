import { LLMService } from "../llm/llm-service";
import { APITool } from "./tool";
import { extractContentFromTags } from "../utils/parsers";
import { logger } from "../logger/winston";
import { z } from "zod";
import { tool } from "ai";

// Zod Schemas
const DateRangeSchema = z
  .object({
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Start date in YYYY-MM-DD format"),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("End date in YYYY-MM-DD format"),
  })
  .refine(
    (data) => new Date(data.start) <= new Date(data.end),
    "Start date must be before or equal to end date"
  );

const NuclearOutageDataSchema = z.object({
  period: z.string().describe("The date of the measurement"),
  outage: z.string().describe("Amount of nuclear power plant outage"),
  capacity: z.string().describe("Total nuclear power plant capacity"),
  percentOutage: z.string().describe("Percentage of capacity that is out"),
  "outage-units": z.string().describe("Units for outage measurement"),
  "capacity-units": z.string().describe("Units for capacity measurement"),
  "percentOutage-units": z
    .string()
    .describe("Units for percentage measurement"),
});

const GetNuclearOutagesToolSchema = {
  name: "get_nuclear_outages",
  description:
    "Fetches nuclear power plant outage data in the United States for a specified date range",
  parameters: z.object({
    dateRange: DateRangeSchema.describe(
      "Date range for fetching nuclear outage data"
    ),
  }),
  execute: async (args: { dateRange: { start: string; end: string } }) => {
    const tool = new NuclearOutagesTool();
    const data = await tool.getRawData(args.dateRange);

    // Calculate summary statistics
    const outages = data.map((d) => parseFloat(d.percentOutage));
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
        capacityUnits: data[0]["capacity-units"],
        numberOfDays: data.length,
      },
      dailyData: data.map((d) => ({
        date: d.period,
        outagePercentage: Number(parseFloat(d.percentOutage).toFixed(2)),
        capacity: Number(parseFloat(d.capacity).toFixed(2)),
      })),
    };
  },
};

// Types
type DateRange = z.infer<typeof DateRangeSchema>;
type NuclearOutageData = z.infer<typeof NuclearOutageDataSchema>;

export class NuclearOutagesTool extends APITool<DateRange> {
  schema = [
    { name: "get_nuclear_outages", tool: tool(GetNuclearOutagesToolSchema) },
  ];

  constructor() {
    super({
      name: "NuclearOutages",
      description:
        "Fetches nuclear power plant outage data in the United States for a specified date range",
      output:
        "Daily nuclear outage data including capacity, outages, and percent outage from Nuclear Regulatory Commission",
      baseUrl: "https://api.eia.gov/v2/nuclear-outages/us-nuclear-outages/data",
      twitterAccount: "@EIAgov",
    });

    if (!process.env.EIA_API_KEY) {
      throw new Error("Missing EIA_API_KEY environment variable");
    }
  }

  async parseInput(input: string, llmService: LLMService): Promise<DateRange> {
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const prompt = `
    You are a helpful assistant that extracts date ranges from user queries about nuclear outages.
    The current date is: ${currentDate}

    Rules:
    1. Extract start and end dates in YYYY-MM-DD format
    2. Start date must be earlier than end date
    3. End date must not be later than current date (${currentDate})
    4. If dates cannot be extracted from the query, use the last 7 days
    5. If only one date is mentioned, assume it's the end date and use 7 days before as start date

    Example queries and responses:
    Query: "show me nuclear outages from January 1st to February 1st"
    Response: { "start": "2024-01-01", "end": "2024-02-01" }

    Query: "what are the current nuclear outages"
    Response: { "start": "2024-03-13", "end": "2024-03-20" } (assuming today is 2024-03-20)

    User query: ${input}

    Respond in the following format:
    <response>
    {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    }
    </response>
    `;

    const response = await llmService.fastllm.generate(prompt);
    const extractedDates = extractContentFromTags(response, "response");

    if (!extractedDates) {
      // Default to last 7 days if no dates could be extracted
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);

      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }

    const dates = JSON.parse(extractedDates);
    return this.validateDates(dates);
  }

  private validateDates(dates: DateRange): DateRange {
    // Validate against the schema
    const validatedDates = DateRangeSchema.parse(dates);

    const currentDate = new Date();
    const startDate = new Date(validatedDates.start);
    const endDate = new Date(validatedDates.end);

    // Ensure end date is not in the future
    if (endDate > currentDate) {
      validatedDates.end = currentDate.toISOString().split("T")[0];
    }

    // Ensure start date is before end date
    if (startDate > endDate) {
      const newStartDate = new Date(validatedDates.end);
      newStartDate.setDate(newStartDate.getDate() - 7);
      validatedDates.start = newStartDate.toISOString().split("T")[0];
    }

    return validatedDates;
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const dateRange = await this.parseInput(input, llmService);
      const data = await this.getRawData(dateRange);

      // Validate the data against the schema
      const validatedData = z.array(NuclearOutageDataSchema).parse(data);

      return this.formatResponse(validatedData, dateRange, llmService);
    } catch (error: any) {
      logger.error("Error fetching nuclear outage data:", error);
      return `Error fetching nuclear outage data: ${error.message}`;
    }
  }

  async getRawData(params: DateRange): Promise<NuclearOutageData[]> {
    const { start, end } = DateRangeSchema.parse(params);

    const url = new URL(this.baseUrl);
    const searchParams = new URLSearchParams({
      frequency: "daily",
      "data[0]": "outage",
      "data[1]": "capacity",
      "data[2]": "percentOutage",
      start,
      end,
      "sort[0][column]": "period",
      "sort[0][direction]": "desc",
      offset: "0",
      length: "5000",
    });

    const response = await fetch(`${url}?${searchParams.toString()}`, {
      headers: {
        "X-Api-Key": process.env.EIA_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    return z.array(NuclearOutageDataSchema).parse(data.response.data);
  }

  private async formatResponse(
    data: NuclearOutageData[],
    dateRange: DateRange,
    llmService: LLMService
  ): Promise<string> {
    const prompt = `
    You are a helpful assistant that summarizes nuclear outage data.
    The data is for the period from ${dateRange.start} to ${dateRange.end}.

    Raw data: ${JSON.stringify(data)}

    Please provide a concise summary that includes:
    1. The date range
    2. The average outage percentage
    3. The highest and lowest outage days
    4. Any notable trends or patterns
    5. The total nuclear capacity in the system

    Make it easy to read and understand for a general audience.
    `;

    return llmService.fastllm.generate(prompt);
  }
}
