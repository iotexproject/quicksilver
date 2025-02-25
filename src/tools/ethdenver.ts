import { logger } from "../logger/winston";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ParentDocumentRetriever } from "langchain/retrievers/parent_document";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Redis } from "@upstash/redis";
import { UpstashRedisStore } from "@langchain/community/storage/upstash_redis";

import { APITool } from "./tool";

const NUMBER_OF_DOCS = 10;
const COLLECTION_NAME = "ethdenver_2";

export class ETHDenverTool extends APITool<any> {
  embeddings: OpenAIEmbeddings;
  vectorStore: QdrantVectorStore;
  retriever: ParentDocumentRetriever;
  constructor() {
    super({
      name: "ETHDenverAPI",
      description: "Descriptions of ETH Denver events 2025",
      output: `Array of ${NUMBER_OF_DOCS} top events description related to the query with their titles and links`,
      baseUrl: "",
    });

    this.initialize();
  }

  private async initialize() {
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
      return `Error fetching headlines: ${error}`; // More robust error handling
    }
  }

  async getRawData(): Promise<any> {
    // const apiKey = process.env.NEWSAPI_API_KEY!;
    // const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    // const response = await axios.get<NewsAPIResponse>(url);
    // return response.data;
  }

  async parseInput(userInput: any): Promise<any> {
    return userInput;
  }
}
