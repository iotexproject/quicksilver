import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
import { LLMService } from "../llm/llm-service";
import { logger } from "../logger/winston";

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6";

// Zod Schemas
const GeocodeFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180).max(180).describe("Longitude"),
      z.number().min(-90).max(90).describe("Latitude"),
    ]),
  }),
  properties: z.object({
    name: z.string().describe("Feature name"),
    mapbox_id: z.string().describe("Unique Mapbox identifier"),
    feature_type: z
      .enum([
        "country",
        "region",
        "postcode",
        "district",
        "place",
        "locality",
        "neighborhood",
        "street",
        "address",
        "secondary_address",
      ])
      .describe("Type of geographic feature"),
    address: z.string().optional().describe("Street address if available"),
    full_address: z.string().optional().describe("Complete formatted address"),
    accuracy: z
      .string()
      .optional()
      .describe("Accuracy of the geocoding result"),
  }),
});

const GeocodeResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(GeocodeFeatureSchema),
  attribution: z.string(),
});

const GetCoordinatesToolSchema = {
  name: "get_coordinates",
  description:
    "Convert a location name or address into geographic coordinates using Mapbox Geocoding API",
  parameters: z.object({
    location: z.string().describe("Location name or address to geocode"),
    country: z
      .string()
      .optional()
      .describe(
        "Limit results to a specific country (ISO 3166-1 alpha-2 code)"
      ),
    type: z
      .enum([
        "country",
        "region",
        "postcode",
        "district",
        "place",
        "locality",
        "neighborhood",
        "street",
        "address",
        "secondary_address",
      ])
      .optional()
      .describe("Limit results to a specific type of location"),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(1)
      .describe("Number of results to return"),
  }),
  execute: async (args: {
    location: string;
    country?: string;
    type?: string;
    limit?: number;
  }) => {
    const tool = new MapboxGeocodingTool();
    const response = await tool.getRawData(args);

    return {
      query: args.location,
      results: response.features.map((feature) => ({
        coordinates: {
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        },
        name: feature.properties.name,
        type: feature.properties.feature_type,
        address: feature.properties.full_address || feature.properties.address,
        accuracy: feature.properties.accuracy,
      })),
    };
  },
};

export class MapboxGeocodingTool extends APITool<any> {
  schema = [{ name: "get_coordinates", tool: tool(GetCoordinatesToolSchema) }];

  constructor() {
    super({
      name: "MapboxGeocoding",
      description:
        "Convert location names and addresses into geographic coordinates",
      output:
        "Geographic coordinates (longitude, latitude) and location details",
      baseUrl: MAPBOX_GEOCODING_URL,
    });

    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error("Missing MAPBOX_ACCESS_TOKEN environment variable");
    }
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const params = await this.parseInput(input, llmService);
      const data = await this.getRawData(params);

      if (data.features.length === 0) {
        return "No results found for the given location.";
      }

      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;

      return `Location: ${feature.properties.name}
Coordinates: [${longitude}, ${latitude}]
Type: ${feature.properties.feature_type}
${feature.properties.full_address ? `Address: ${feature.properties.full_address}` : ""}`;
    } catch (error) {
      logger.error("Mapbox Geocoding Error:", error);
      return `Error geocoding location: ${error}`;
    }
  }

  async parseInput(input: string, llmService: LLMService): Promise<any> {
    const prompt = `
    You are a helpful assistant that parses user queries for the Mapbox Geocoding tool.
    The user's query is: ${input}

    Extract the following information if present:
    - location: The main location or address to look up (required)
    - country: Two-letter country code if specified
    - type: Type of location (country, region, place, address, etc.)
    - limit: Number of results to return (1-10)

    Respond in the following format:
    <response>
    {
      "location": "string",
      "country": "string" (optional),
      "type": "string" (optional),
      "limit": number (optional)
    }
    </response>
    `;

    const response = await llmService.fastllm.generate(prompt);
    const params = JSON.parse(response);
    return params;
  }

  async getRawData(params: {
    location: string;
    country?: string;
    type?: string;
    limit?: number;
  }): Promise<z.infer<typeof GeocodeResponseSchema>> {
    const queryParams = new URLSearchParams({
      q: params.location,
      access_token: process.env.MAPBOX_ACCESS_TOKEN!,
      limit: params.limit?.toString() || "1",
      ...(params.country && { country: params.country }),
      ...(params.type && { types: params.type }),
    });

    const response = await fetch(
      `${this.baseUrl}/forward?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return GeocodeResponseSchema.parse(data);
  }
}
