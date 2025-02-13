import axios from "axios";

import { APITool } from "./tool";

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: { source: { name: string }; title: string; url: string }[]; // Include URL
}

const NUMBER_OF_HEADLINES = 10;

export class NewsAPITool extends APITool<any> {
  constructor() {
    super({
      name: "NewsAPI",
      description: "Fetches today's headlines from News API",
      output: `Array of ${NUMBER_OF_HEADLINES} top headlines with their titles and links`,
      baseUrl: "https://newsapi.org/v2/top-headlines?country=us&apiKey=",
    });

    if (!process.env.NEWSAPI_API_KEY) {
      throw new Error("Please set the NEWSAPI_API_KEY environment variable.");
    }
  }

  async execute(_: string): Promise<string> {
    try {
      const response = await this.getRawData();

      if (response.status === "ok") {
        const headlines = response.articles.map(
          (article) =>
            `- [${article.title}](${article.url}) - ${article.source.name}`,
        ); // Markdown links
        return headlines.slice(0, NUMBER_OF_HEADLINES).join("\n");
      } else {
        return `Error fetching headlines: ${response.status}`; // Return error as string
      }
    } catch (error) {
      console.error("NewsAPI Error", error);
      return `Error fetching headlines: ${error}`; // More robust error handling
    }
  }

  async getRawData(): Promise<NewsAPIResponse> {
    const apiKey = process.env.NEWSAPI_API_KEY!;
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    const response = await axios.get<NewsAPIResponse>(url);
    return response.data;
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
  }
}
