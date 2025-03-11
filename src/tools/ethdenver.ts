import { logger } from "../logger/winston";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ParentDocumentRetriever } from "langchain/retrievers/parent_document";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Redis } from "@upstash/redis";
import { UpstashRedisStore } from "@langchain/community/storage/upstash_redis";
import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";

const NUMBER_OF_DOCS = 10;
const COLLECTION_NAME = "ethdenver_2";

const SearchEventsToolSchema = {
  name: "search_ethdenver_events",
  description: `Search for ETH Denver 2025 events based on a query`,
  parameters: z.object({
    query: z.string().describe("Search query for ETH Denver events"),
  }),
  execute: async (input: { query: string }) => {
    try {
      const tool = new ETHDenverTool();
      await tool.initialize();
      return await tool.execute(input.query);
    } catch (error) {
      logger.error("Error executing search_ethdenver_events tool", error);
      return `Error executing search_ethdenver_events tool`;
    }
  },
};

export class ETHDenverTool extends APITool<{ query: string }> {
  embeddings: OpenAIEmbeddings;
  vectorStore: QdrantVectorStore;
  retriever: ParentDocumentRetriever;

  schema = [
    {
      name: SearchEventsToolSchema.name,
      tool: tool(SearchEventsToolSchema),
    },
  ];

  constructor() {
    super({
      name: "ETHDenver",
      description: "Tool for searching ETH Denver 2025 events information",
      baseUrl: "",
    });
  }

  async initialize() {
    if (!process.env.VECTOR_DB_URI) {
      throw new Error("Please set the VECTOR_DB_URI environment variable.");
    }

    const uri = process.env.VECTOR_DB_URI;
    // TODO: Remove requirement of apiKey
    const apiKey = process.env.VECTOR_DB_API_KEY;

    const dbClient = new QdrantClient({
      url: uri,
      apiKey: apiKey,
    });

    this.embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });

    this.vectorStore = await QdrantVectorStore.fromExistingCollection(
      this.embeddings,
      {
        client: dbClient,
        collectionName: COLLECTION_NAME,
      }
    );
    // TODO: move redis db
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const byteStore = new UpstashRedisStore({
      client,
    });
    this.retriever = new ParentDocumentRetriever({
      vectorstore: this.vectorStore,
      byteStore: byteStore,
      childSplitter: new RecursiveCharacterTextSplitter({
        chunkSize: 700,
        chunkOverlap: 100,
      }),
      parentK: NUMBER_OF_DOCS,
    });
  }

  async execute(query: string): Promise<string> {
    try {
      const retrievedDocs = await this.retriever.invoke(query);
      logger.debug("retrievedDocs %O", retrievedDocs);
      return retrievedDocs.map((doc) => doc.pageContent).join("\n");
    } catch (error) {
      logger.error("ETHDenver Error", error);
      return `Error fetching events: ${error}`;
    }
  }

  async getRawData(params: { query: string }): Promise<any> {
    return this.execute(params.query);
  }
}
