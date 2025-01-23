import axios from "axios";

import { APITool } from "../tool";

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: { source: { name: string }; title: string; url: string }[]; // Include URL
}

export class NewsAPITool extends APITool<any> {
  constructor() {
    super(
      "NewsAPI",
      "Fetches today's headlines from News API",
      process.env.NEWSAPI_API_KEY!,
    );

    if (!process.env.NEWSAPI_API_KEY) {
      console.error("Please set the NUBILA_API_KEY environment variable.");
      return;
    }
  }

  async execute(_: string): Promise<string> {
    const apiKey = process.env.NEWSAPI_API_KEY!;
    try {
      const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
      const response = await axios.get<NewsAPIResponse>(url);

      if (response.data.status === "ok") {
        const headlines = response.data.articles.map(
          (article) =>
            `- [${article.title}](${article.url}) - ${article.source.name}`,
        ); // Markdown links
        return headlines.slice(0, 10).join("\n");
      } else {
        return `Error fetching headlines: ${response.data.status}`; // Return error as string
      }
    } catch (error) {
      console.error("NewsAPI Error", error);
      return `Error fetching headlines: ${error}`; // More robust error handling
    }
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
  }
}
