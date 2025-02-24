import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
import { LLMService } from "../llm/llm-service";
import { logger } from "../logger/winston";

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6";
const MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox";

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

const RouteStepSchema = z.object({
  distance: z.number().describe("Distance of the step in meters"),
  duration: z.number().describe("Duration of the step in seconds"),
  geometry: z.string().describe("Encoded polyline geometry"),
  maneuver: z.object({
    instruction: z.string().describe("Human-readable instruction"),
    type: z.string().describe("Type of maneuver"),
    modifier: z.string().optional().describe("Direction modifier"),
  }),
  name: z.string().describe("Name of the road or path"),
});

const RouteSchema = z.object({
  distance: z.number().describe("Total distance in meters"),
  duration: z.number().describe("Total duration in seconds"),
  geometry: z.string().describe("Encoded polyline geometry of the route"),
  legs: z.array(
    z.object({
      steps: z.array(RouteStepSchema),
      summary: z.string().describe("Summary of the route leg"),
      distance: z.number(),
      duration: z.number(),
    })
  ),
  weight: z.number().describe("Route weight for optimization"),
  weight_name: z.string().describe("Type of weight used"),
});

const DirectionsResponseSchema = z.object({
  routes: z.array(RouteSchema),
  waypoints: z.array(
    z.object({
      location: z.tuple([z.number(), z.number()]),
      name: z.string(),
    })
  ),
  code: z.string(),
  uuid: z.string(),
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
    const tool = new MapboxTool();
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

const GetDirectionsToolSchema = {
  name: "get_directions",
  description: "Get driving, walking, or cycling directions between locations",
  parameters: z.object({
    origin: z.string().describe("Starting location"),
    destination: z.string().describe("Destination location"),
    profile: z
      .enum(["driving", "walking", "cycling"])
      .default("driving")
      .describe("Mode of transportation"),
    alternatives: z
      .boolean()
      .default(false)
      .describe("Whether to return alternative routes"),
    avoid: z
      .array(z.string())
      .optional()
      .describe("Features to avoid (e.g., ['toll', 'motorway'])"),
  }),
  execute: async (args: {
    origin: string;
    destination: string;
    profile?: string;
    alternatives?: boolean;
    avoid?: string[];
  }) => {
    const tool = new MapboxTool();

    // First, geocode the origin and destination
    const originCoords = await tool.geocodeLocation(args.origin);
    const destCoords = await tool.geocodeLocation(args.destination);

    // Then get the directions
    const directions = await tool.getDirections({
      coordinates: [originCoords, destCoords],
      profile: args.profile || "driving",
      alternatives: args.alternatives,
      avoid: args.avoid,
    });

    return {
      summary: {
        distance: (directions.routes[0].distance / 1000).toFixed(1) + " km",
        duration: Math.round(directions.routes[0].duration / 60) + " minutes",
        origin: args.origin,
        destination: args.destination,
        mode: args.profile,
      },
      routes: directions.routes.map((route) => ({
        distance: (route.distance / 1000).toFixed(1) + " km",
        duration: Math.round(route.duration / 60) + " minutes",
        steps: route.legs[0].steps.map((step) => ({
          instruction: step.maneuver.instruction,
          distance: (step.distance / 1000).toFixed(1) + " km",
          duration: Math.round(step.duration / 60) + " minutes",
        })),
      })),
    };
  },
};

export class MapboxTool extends APITool<any> {
  schema = [
    { name: "get_coordinates", tool: tool(GetCoordinatesToolSchema) },
    { name: "get_directions", tool: tool(GetDirectionsToolSchema) },
  ];

  constructor() {
    super({
      name: "Mapbox",
      description:
        "Convert locations to coordinates and get directions between places",
      output: "Geographic coordinates, directions, and route information",
      baseUrl: MAPBOX_GEOCODING_URL,
    });

    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error("Missing MAPBOX_ACCESS_TOKEN environment variable");
    }
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const params = await this.parseInput(input, llmService);

      if (params.type === "directions") {
        const directions = await this.getDirectionsFromText(params, llmService);
        return this.formatDirectionsResponse(directions, llmService);
      } else {
        // Handle existing geocoding functionality
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
      }
    } catch (error) {
      logger.error("Mapbox Error:", error);
      return `Error: ${error}`;
    }
  }

  async parseInput(input: string, llmService: LLMService): Promise<any> {
    const prompt = `
    Parse the user's query for the Mapbox tool.
    Query: ${input}

    Determine if this is a:
    1. Location lookup (coordinates)
    2. Directions request

    For directions, extract:
    - Origin location
    - Destination location
    - Mode of transport (driving/walking/cycling)
    - Any preferences (avoid tolls, etc.)

    For location lookup, extract:
    - Location name
    - Country (if specified)
    - Type of location

    Respond in JSON format within <response> tags.
    `;

    const response = await llmService.fastllm.generate(prompt);
    const params = JSON.parse(response);
    return params;
  }

  async geocodeLocation(location: string): Promise<[number, number]> {
    const params = new URLSearchParams({
      q: location,
      access_token: process.env.MAPBOX_ACCESS_TOKEN!,
      limit: "1",
    });

    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/forward?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.features[0].geometry.coordinates;
  }

  async getDirections(params: {
    coordinates: [number, number][];
    profile: string;
    alternatives?: boolean;
    avoid?: string[];
  }): Promise<z.infer<typeof DirectionsResponseSchema>> {
    const coordString = params.coordinates
      .map((coord) => coord.join(","))
      .join(";");

    const queryParams = new URLSearchParams({
      access_token: process.env.MAPBOX_ACCESS_TOKEN!,
      alternatives: params.alternatives ? "true" : "false",
      geometries: "polyline",
      overview: "full",
      steps: "true",
    });

    if (params.avoid?.length) {
      queryParams.append("exclude", params.avoid.join(","));
    }

    const response = await fetch(
      `${MAPBOX_DIRECTIONS_URL}/${params.profile}/${coordString}?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Directions request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return DirectionsResponseSchema.parse(data);
  }

  async getDirectionsFromText(
    params: any,
    llmService: LLMService
  ): Promise<any> {
    const originCoords = await this.geocodeLocation(params.origin);
    const destCoords = await this.geocodeLocation(params.destination);

    return this.getDirections({
      coordinates: [originCoords, destCoords],
      profile: params.profile || "driving",
      alternatives: params.alternatives,
      avoid: params.avoid,
    });
  }

  async formatDirectionsResponse(
    directions: any,
    llmService: LLMService
  ): Promise<string> {
    const prompt = `
    Format the following directions data into a human-readable response:
    ${JSON.stringify(directions)}

    Include:
    1. Total distance and duration
    2. Key steps of the journey
    3. Any alternative routes if available
    4. Notable information (traffic, tolls, etc.)

    Make it conversational and helpful.
    `;

    return llmService.fastllm.generate(prompt);
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
