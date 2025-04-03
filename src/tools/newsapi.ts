import axios from 'axios';
import { z } from 'zod';
import { tool } from 'ai';
import { logger } from '../logger/winston';
import { APITool } from './tool';

const CategoryEnum = z
  .enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'])
  .describe('News category to fetch headlines for');

// Can be used to parse the response if needed
// const NewsArticleSchema = z.object({
//   source: z.object({
//     name: z.string().describe("Name of the news source"),
//   }),
//   title: z.string().describe("Title of the article"),
//   url: z.string().url().describe("URL of the article"),
//   description: z.string().nullable().describe("Article description or snippet"),
//   publishedAt: z.string().describe("Publication date and time in UTC"),
//   urlToImage: z.string().nullable().describe("URL to article image"),
//   content: z
//     .string()
//     .nullable()
//     .describe("Article content (truncated to 200 chars)"),
// });

// const NewsAPIResponseSchema = z.object({
//   status: z.string().describe("API response status"),
//   totalResults: z.number().describe("Total number of results"),
//   articles: z.array(NewsArticleSchema).describe("List of news articles"),
// });

interface NewsAPIParams {
  category?: string;
  q?: string;
}

const GetHeadlinesToolSchema = {
  name: 'get_headlines',
  description: "Fetches today's top headlines from News API. You can filter by country, category, and search keywords.",
  parameters: z.object({
    category: CategoryEnum.optional().describe(
      'Category to filter headlines by: business, entertainment, general, health, science, sports, technology'
    ),
    q: z.string().optional().describe('Keywords or phrase to search for in the headlines'),
  }),
  execute: async (input: NewsAPIParams) => {
    try {
      const tool = new NewsAPITool();
      return await tool.getRawData(input);
    } catch (error) {
      logger.error('Error executing get_headlines tool', error);
      return `Error executing get_headlines tool`;
    }
  },
};

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: {
    source: { name: string };
    title: string;
    url: string;
    description: string | null;
    publishedAt: string;
    urlToImage: string | null;
    content: string | null;
  }[];
}

export class NewsAPITool extends APITool<NewsAPIParams> {
  schema = [{ name: GetHeadlinesToolSchema.name, tool: tool(GetHeadlinesToolSchema) }];

  constructor() {
    super({
      name: GetHeadlinesToolSchema.name,
      description: GetHeadlinesToolSchema.description,
      baseUrl: 'https://newsapi.org/v2/top-headlines',
    });

    if (!process.env.NEWSAPI_API_KEY) {
      throw new Error('Please set the NEWSAPI_API_KEY environment variable.');
    }
  }

  public async getRawData(params: NewsAPIParams): Promise<NewsAPIResponse> {
    const validatedParams = GetHeadlinesToolSchema.parameters.parse(params);
    return this.fetchNews(validatedParams);
  }

  private async fetchNews(params: NewsAPIParams): Promise<NewsAPIResponse> {
    const apiKey = process.env.NEWSAPI_API_KEY!;
    const queryParams = new URLSearchParams({
      country: 'us',
      apiKey,
      ...(params.category && { category: params.category }),
      ...(params.q && { q: params.q }),
    });

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    const response = await axios.get<NewsAPIResponse>(url);

    return response.data;
  }
}
