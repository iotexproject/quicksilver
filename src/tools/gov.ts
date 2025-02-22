import { LLMService } from "../llm/llm-service";
import { APITool } from "./tool";
import { extractContentFromTags } from "../utils/parsers";

interface DateRange {
  start: string; // YYYY-MM-DD format
  end: string; // YYYY-MM-DD format
}

interface NuclearOutageData {
  period: string;
  outage: string;
  capacity: string;
  percentOutage: string;
  "outage-units": string;
  "capacity-units": string;
  "percentOutage-units": string;
}

export class NuclearOutagesTool extends APITool<DateRange> {
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
    const currentDate = new Date();
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);

    // Ensure end date is not in the future
    if (endDate > currentDate) {
      dates.end = currentDate.toISOString().split("T")[0];
    }

    // Ensure start date is before end date
    if (startDate > endDate) {
      const newStartDate = new Date(dates.end);
      newStartDate.setDate(newStartDate.getDate() - 7);
      dates.start = newStartDate.toISOString().split("T")[0];
    }

    return dates;
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const dateRange = await this.parseInput(input, llmService);
      const data = await this.getRawData(dateRange);
      return this.formatResponse(data, dateRange, llmService);
    } catch (error: any) {
      console.error("Error fetching nuclear outage data:", error);
      return `Error fetching nuclear outage data: ${error.message}`;
    }
  }

  async getRawData(params: DateRange): Promise<NuclearOutageData[]> {
    const { start, end } = params;
    if (!start || !end) {
      throw new Error("Start and end dates are required.");
    }
    const url = new URL(this.baseUrl);
    const searchParams = new URLSearchParams({
      frequency: "daily",
      "data[0]": "outage",
      "data[1]": "capacity",
      "data[2]": "percentOutage",
      start: params.start,
      end: params.end,
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
    return data.response.data;
  }

  private async formatResponse(
    data: NuclearOutageData[],
    dateRange: DateRange,
    llmService: LLMService,
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
