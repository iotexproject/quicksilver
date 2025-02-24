import axios from "axios";
import { z } from "zod";
import { tool } from "ai";
import { logger } from "../logger/winston";

import { APITool } from "./tool";

const CategoryEnum = z
  .enum([
    "business",
    "entertainment",
    "general",
    "health",
    "science",
    "sports",
    "technology",
  ])
  .describe("News category to fetch headlines for");

const NewsArticleSchema = z.object({
  source: z.object({
    name: z.string().describe("Name of the news source"),
  }),
  title: z.string().describe("Title of the article"),
  url: z.string().url().describe("URL of the article"),
  description: z.string().nullable().describe("Article description or snippet"),
  publishedAt: z.string().describe("Publication date and time in UTC"),
  urlToImage: z.string().nullable().describe("URL to article image"),
  content: z
    .string()
    .nullable()
    .describe("Article content (truncated to 200 chars)"),
});

const NewsAPIResponseSchema = z.object({
  status: z.string().describe("API response status"),
  totalResults: z.number().describe("Total number of results"),
  articles: z.array(NewsArticleSchema).describe("List of news articles"),
});

const GetHeadlinesToolSchema = {
  name: "get_headlines",
  description:
    "Fetches today's top headlines from News API. You can filter by country, category, and search keywords.",
  parameters: z.object({
    category: CategoryEnum.optional().describe(
      "Category to filter headlines by: business, entertainment, general, health, science, sports, technology"
    ),
    q: z
      .string()
      .optional()
      .describe("Keywords or phrase to search for in the headlines"),
  }),
  execute: async (args: { category?: string; q?: string }) => {
    const tool = new NewsAPITool();
    const response = await tool.getRawData(args);
    return {
      articles: response.articles.map((article) => ({
        title: article.title,
        url: article.url,
        source: article.source.name,
        description: article.description,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage,
        content: article.content,
      })),
      totalResults: response.totalResults,
    };
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

const NUMBER_OF_HEADLINES = 10;

export class NewsAPITool extends APITool<any> {
  schema = [{ name: "get_headlines", tool: tool(GetHeadlinesToolSchema) }];

  constructor() {
    super({
      name: "NewsAPI",
      description:
        "Fetches today's headlines from News API with support for filtering by category and keywords",
      output: `Array of headlines with their titles, links, descriptions, and other metadata`,
      baseUrl: "https://newsapi.org/v2/top-headlines",
    });

    if (!process.env.NEWSAPI_API_KEY) {
      throw new Error("Please set the NEWSAPI_API_KEY environment variable.");
    }
  }

  async execute(input: string): Promise<string> {
    try {
      const response = await this.getRawData({});

      if (response.status === "ok") {
        const headlines = response.articles.map(
          (article) =>
            `- [${article.title}](${article.url}) - ${article.source.name}\n  ${article.description || ""}`
        );
        return headlines.slice(0, NUMBER_OF_HEADLINES).join("\n");
      } else {
        return `Error fetching headlines: ${response.status}`;
      }
    } catch (error) {
      logger.error("NewsAPI Error", error);
      return `Error fetching headlines: ${error}`;
    }
  }

  async getRawData(params: {
    category?: string;
    q?: string;
  }): Promise<NewsAPIResponse> {
    const apiKey = process.env.NEWSAPI_API_KEY!;
    const queryParams = new URLSearchParams({
      country: "us",
      apiKey,
      ...(params.category && { category: params.category }),
      ...(params.q && { q: params.q }),
    });

    const url = `${this.baseUrl}?${queryParams.toString()}`;
    const response = await axios.get<NewsAPIResponse>(url);

    // Validate response data against schema
    const validatedData = NewsAPIResponseSchema.parse(response.data);
    return validatedData;
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
  }
}
