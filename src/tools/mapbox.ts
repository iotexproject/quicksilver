import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
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

// Coordinate regex pattern for validating coordinate strings
const COORDINATE_REGEX = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

// Input types
type GeocodeParams = {
  location: string;
  country?: string;
  type?: string;
  limit?: number;
};

type ReverseGeocodeParams = {
  longitude: number;
  latitude: number;
  limit?: number;
};

type DirectionsParams = {
  origin: string;
  destination: string;
  profile?: string;
  alternatives?: boolean;
  avoid?: string[];
};

// Helper function to parse coordinate string
const parseCoordinateString = (coordStr: string): [number, number] | null => {
  if (!COORDINATE_REGEX.test(coordStr)) return null;

  const [lng, lat] = coordStr.split(",").map(Number);
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

  return [lng, lat];
};

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
  execute: async (args: GeocodeParams) => {
    try {
      const tool = new MapboxTool();
      const response = await tool.getGeocodingData(args);

      return {
        query: args.location,
        results: response.features.map((feature) => ({
          coordinates: {
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
          },
          name: feature.properties.name,
          type: feature.properties.feature_type,
          address:
            feature.properties.full_address || feature.properties.address,
          accuracy: feature.properties.accuracy,
        })),
      };
    } catch (error) {
      logger.error("Error executing get_coordinates tool", error);
      return `Error executing get_coordinates tool`;
    }
  },
};

const GetLocationFromCoordinatesToolSchema = {
  name: "get_location_from_coordinates",
  description:
    "Convert geographic coordinates into a location name or address using Mapbox Reverse Geocoding API",
  parameters: z.object({
    longitude: z.number().min(-180).max(180).describe("Longitude coordinate"),
    latitude: z.number().min(-90).max(90).describe("Latitude coordinate"),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(1)
      .describe("Number of results to return"),
  }),
  execute: async (args: ReverseGeocodeParams) => {
    try {
      const tool = new MapboxTool();
      const response = await tool.getReverseGeocodingData(args);

      return {
        coordinates: {
          longitude: args.longitude,
          latitude: args.latitude,
        },
        results: response.features.map((feature) => ({
          name: feature.properties.name,
          type: feature.properties.feature_type,
          address:
            feature.properties.full_address || feature.properties.address,
          accuracy: feature.properties.accuracy,
        })),
      };
    } catch (error) {
      logger.error("Error executing get_location_from_coordinates tool", error);
      return `Error executing get_location_from_coordinates tool`;
    }
  },
};

const GetDirectionsToolSchema = {
  name: "get_directions",
  description: "Get driving, walking, or cycling directions between locations",
  parameters: z.object({
    origin: z
      .string()
      .describe(
        "Starting location (address or 'longitude,latitude' coordinates)"
      ),
    destination: z
      .string()
      .describe(
        "Destination location (address or 'longitude,latitude' coordinates)"
      ),
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
  execute: async (args: DirectionsParams) => {
    try {
      const tool = new MapboxTool();

      // Parse origin and destination - they could be coordinates or location names
      let originCoords: [number, number];
      let destCoords: [number, number];

      // Check if origin is already coordinates
      const originParsed = parseCoordinateString(args.origin);
      if (originParsed) {
        originCoords = originParsed;
      } else {
        // If not coordinates, geocode the location name
        originCoords = await tool.geocodeLocation(args.origin);
      }

      // Check if destination is already coordinates
      const destParsed = parseCoordinateString(args.destination);
      if (destParsed) {
        destCoords = destParsed;
      } else {
        // If not coordinates, geocode the location name
        destCoords = await tool.geocodeLocation(args.destination);
      }

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
    } catch (error) {
      logger.error("Error executing get_directions tool", error);
      return `Error executing get_directions tool`;
    }
  },
};

export class MapboxTool extends APITool<
  GeocodeParams | DirectionsParams | ReverseGeocodeParams
> {
  schema = [
    {
      name: GetCoordinatesToolSchema.name,
      tool: tool(GetCoordinatesToolSchema),
    },
    {
      name: GetLocationFromCoordinatesToolSchema.name,
      tool: tool(GetLocationFromCoordinatesToolSchema),
    },
    {
      name: GetDirectionsToolSchema.name,
      tool: tool(GetDirectionsToolSchema),
    },
  ];

  constructor() {
    super({
      name: "Mapbox",
      description:
        "Convert locations to coordinates, coordinates to locations, and get directions between places",
      baseUrl: MAPBOX_GEOCODING_URL,
    });

    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error("Missing MAPBOX_ACCESS_TOKEN environment variable");
    }
  }

  async geocodeLocation(location: string): Promise<[number, number]> {
    try {
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
      if (!data.features || data.features.length === 0) {
        throw new Error(`No results found for location: ${location}`);
      }

      return data.features[0].geometry.coordinates;
    } catch (error: any) {
      throw new Error(`Failed to geocode location: ${error.message}`);
    }
  }

  async getReverseGeocodingData(
    params: ReverseGeocodeParams
  ): Promise<z.infer<typeof GeocodeResponseSchema>> {
    try {
      const validatedParams =
        GetLocationFromCoordinatesToolSchema.parameters.parse(params);

      const queryParams = new URLSearchParams({
        longitude: validatedParams.longitude.toString(),
        latitude: validatedParams.latitude.toString(),
        access_token: process.env.MAPBOX_ACCESS_TOKEN!,
        limit: validatedParams.limit?.toString() || "1",
      });

      const response = await fetch(
        `${MAPBOX_GEOCODING_URL}/reverse?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Reverse geocoding request failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      return GeocodeResponseSchema.parse(data);
    } catch (error: any) {
      if (error.name === "ZodError") {
        throw new Error(
          `Invalid parameters or response format: ${error.message}`
        );
      }
      throw new Error(`Failed to get reverse geocoding data: ${error.message}`);
    }
  }

  async getDirections(params: {
    coordinates: [number, number][];
    profile: string;
    alternatives?: boolean;
    avoid?: string[];
  }): Promise<z.infer<typeof DirectionsResponseSchema>> {
    try {
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
    } catch (error: any) {
      if (error.name === "ZodError") {
        throw new Error(`Invalid directions response format: ${error.message}`);
      }
      throw new Error(`Failed to get directions: ${error.message}`);
    }
  }

  async getGeocodingData(
    params: GeocodeParams
  ): Promise<z.infer<typeof GeocodeResponseSchema>> {
    try {
      const validatedParams = GetCoordinatesToolSchema.parameters.parse(params);

      const queryParams = new URLSearchParams({
        q: validatedParams.location,
        access_token: process.env.MAPBOX_ACCESS_TOKEN!,
        limit: validatedParams.limit?.toString() || "1",
        ...(validatedParams.country && { country: validatedParams.country }),
        ...(validatedParams.type && { types: validatedParams.type }),
      });

      const response = await fetch(
        `${this.baseUrl}/forward?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return GeocodeResponseSchema.parse(data);
    } catch (error: any) {
      if (error.name === "ZodError") {
        throw new Error(
          `Invalid parameters or response format: ${error.message}`
        );
      }
      throw new Error(`Failed to get geocoding data: ${error.message}`);
    }
  }

  async getRawData(
    params: GeocodeParams | DirectionsParams | ReverseGeocodeParams
  ): Promise<any> {
    // This method is required by the APITool abstract class but we're using more specific methods
    // Determine which operation to perform based on the parameters
    if ("location" in params) {
      return this.getGeocodingData(params);
    } else if ("longitude" in params && "latitude" in params) {
      return this.getReverseGeocodingData(params);
    } else if ("origin" in params && "destination" in params) {
      // Parse origin and destination - they could be coordinates or location names
      let originCoords: [number, number];
      let destCoords: [number, number];

      // Check if origin is already coordinates
      const originParsed = parseCoordinateString(params.origin);
      if (originParsed) {
        originCoords = originParsed;
      } else {
        // If not coordinates, geocode the location name
        originCoords = await this.geocodeLocation(params.origin);
      }

      // Check if destination is already coordinates
      const destParsed = parseCoordinateString(params.destination);
      if (destParsed) {
        destCoords = destParsed;
      } else {
        // If not coordinates, geocode the location name
        destCoords = await this.geocodeLocation(params.destination);
      }

      // Then get the directions
      return this.getDirections({
        coordinates: [originCoords, destCoords],
        profile: params.profile || "driving",
        alternatives: params.alternatives,
        avoid: params.avoid,
      });
    } else {
      throw new Error(
        "Invalid parameters: must provide either location for geocoding, longitude/latitude for reverse geocoding, or origin/destination for directions"
      );
    }
  }
}
