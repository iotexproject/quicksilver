import { describe, it, expect, beforeEach, vi } from "vitest";

import { MapboxTool } from "../mapbox";

describe("MapboxTool", () => {
  let mapboxTool: MapboxTool;
  let mockFetch: any;

  beforeEach(() => {
    process.env.MAPBOX_ACCESS_TOKEN = "test-access-token";
    mapboxTool = new MapboxTool();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe("constructor", () => {
    it("should initialize with correct properties", () => {
      expect(mapboxTool.name).toBe("Mapbox");
      expect(mapboxTool.description).toBe(
        "Convert locations to coordinates, coordinates to locations, and get directions between places"
      );
      expect(mapboxTool.schema).toHaveLength(3);
      expect(mapboxTool.schema[0].name).toBe("get_coordinates");
      expect(mapboxTool.schema[1].name).toBe("get_location_from_coordinates");
      expect(mapboxTool.schema[2].name).toBe("get_directions");
    });

    it("should throw error if API key is missing", () => {
      delete process.env.MAPBOX_ACCESS_TOKEN;
      expect(() => new MapboxTool()).toThrow(
        "Missing MAPBOX_ACCESS_TOKEN environment variable"
      );
    });
  });

  describe("getGeocodingData", () => {
    const mockGeocodeResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            name: "San Francisco",
            mapbox_id: "abc123",
            feature_type: "place",
            full_address: "San Francisco, California, United States",
            accuracy: "high",
          },
        },
      ],
      attribution: "MAPBOX",
    };

    it("should fetch and validate geocoding data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGeocodeResponse),
      });

      const result = await mapboxTool.getGeocodingData({
        location: "San Francisco",
      });

      expect(result).toEqual(mockGeocodeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /.*forward\?q=San\+Francisco.*access_token=test-access-token.*/
        )
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        mapboxTool.getGeocodingData({ location: "Invalid Location" })
      ).rejects.toThrow("Geocoding request failed: Not Found");
    });

    it("should validate parameters", async () => {
      // @ts-ignore: Testing invalid parameters
      await expect(mapboxTool.getGeocodingData({})).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        mapboxTool.getGeocodingData({ location: "San Francisco" })
      ).rejects.toThrow("Failed to get geocoding data: Network error");
    });

    it("should handle invalid response format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      await expect(
        mapboxTool.getGeocodingData({ location: "San Francisco" })
      ).rejects.toThrow("Invalid parameters or response format");
    });
  });

  describe("getReverseGeocodingData", () => {
    const mockReverseGeocodeResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            name: "Market Street",
            mapbox_id: "abc123",
            feature_type: "street",
            full_address:
              "Market Street, San Francisco, California, United States",
            accuracy: "high",
          },
        },
      ],
      attribution: "MAPBOX",
    };

    it("should fetch and validate reverse geocoding data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReverseGeocodeResponse),
      });

      const result = await mapboxTool.getReverseGeocodingData({
        longitude: -122.4194,
        latitude: 37.7749,
      });

      expect(result).toEqual(mockReverseGeocodeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /.*reverse\?longitude=-122.4194&latitude=37.7749.*access_token=test-access-token.*/
        )
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        mapboxTool.getReverseGeocodingData({
          longitude: -122.4194,
          latitude: 37.7749,
        })
      ).rejects.toThrow("Reverse geocoding request failed: Not Found");
    });

    it("should validate parameters", async () => {
      // @ts-ignore: Testing invalid parameters
      await expect(mapboxTool.getReverseGeocodingData({})).rejects.toThrow();

      await expect(
        mapboxTool.getReverseGeocodingData({
          longitude: 200,
          latitude: 37.7749,
        })
      ).rejects.toThrow("Invalid parameters");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        mapboxTool.getReverseGeocodingData({
          longitude: -122.4194,
          latitude: 37.7749,
        })
      ).rejects.toThrow("Failed to get reverse geocoding data: Network error");
    });

    it("should handle invalid response format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      await expect(
        mapboxTool.getReverseGeocodingData({
          longitude: -122.4194,
          latitude: 37.7749,
        })
      ).rejects.toThrow("Invalid parameters or response format");
    });
  });

  describe("geocodeLocation", () => {
    it("should return coordinates for a valid location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                geometry: {
                  coordinates: [-122.4194, 37.7749],
                },
              },
            ],
          }),
      });

      const result = await mapboxTool.geocodeLocation("San Francisco");
      expect(result).toEqual([-122.4194, 37.7749]);
    });

    it("should throw error when no results found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      });

      await expect(
        mapboxTool.geocodeLocation("NonexistentPlace")
      ).rejects.toThrow("No results found for location: NonexistentPlace");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(mapboxTool.geocodeLocation("San Francisco")).rejects.toThrow(
        "Geocoding failed: Not Found"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(mapboxTool.geocodeLocation("San Francisco")).rejects.toThrow(
        "Failed to geocode location: Network error"
      );
    });
  });

  describe("getDirections", () => {
    const mockDirectionsResponse = {
      routes: [
        {
          distance: 10000,
          duration: 1200,
          geometry: "encoded_polyline",
          legs: [
            {
              steps: [
                {
                  distance: 5000,
                  duration: 600,
                  geometry: "encoded_step_polyline",
                  maneuver: {
                    instruction: "Turn right",
                    type: "turn",
                    modifier: "right",
                  },
                  name: "Main Street",
                },
              ],
              summary: "Main Street",
              distance: 5000,
              duration: 600,
            },
          ],
          weight: 1500,
          weight_name: "routability",
        },
      ],
      waypoints: [
        {
          location: [-122.4194, 37.7749],
          name: "Start",
        },
        {
          location: [-122.4, 37.8],
          name: "End",
        },
      ],
      code: "Ok",
      uuid: "abc123",
    };

    it("should fetch and validate directions data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDirectionsResponse),
      });

      const result = await mapboxTool.getDirections({
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4, 37.8],
        ],
        profile: "driving",
      });

      expect(result).toEqual(mockDirectionsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /.*mapbox\/driving\/-122.4194,37.7749;-122.4,37.8\?access_token=test-access-token.*/
        )
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        mapboxTool.getDirections({
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4, 37.8],
          ],
          profile: "driving",
        })
      ).rejects.toThrow("Directions request failed: Not Found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        mapboxTool.getDirections({
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4, 37.8],
          ],
          profile: "driving",
        })
      ).rejects.toThrow("Failed to get directions: Network error");
    });

    it("should handle invalid response format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      await expect(
        mapboxTool.getDirections({
          coordinates: [
            [-122.4194, 37.7749],
            [-122.4, 37.8],
          ],
          profile: "driving",
        })
      ).rejects.toThrow("Invalid directions response format");
    });
  });

  describe("getRawData", () => {
    it("should call getGeocodingData for location parameters", async () => {
      const mockGeocodeResponse = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [-122.4194, 37.7749] as [number, number],
            },
            properties: {
              name: "San Francisco",
              mapbox_id: "abc123",
              feature_type: "place" as const,
              full_address: "San Francisco, California, United States",
              accuracy: "high",
            },
          },
        ],
        attribution: "MAPBOX",
      };

      const spy = vi
        .spyOn(mapboxTool, "getGeocodingData")
        .mockResolvedValueOnce(mockGeocodeResponse);

      await mapboxTool.getRawData({ location: "San Francisco" });
      expect(spy).toHaveBeenCalledWith({ location: "San Francisco" });
    });

    it("should call getReverseGeocodingData for longitude/latitude parameters", async () => {
      const mockReverseGeocodeResponse = {
        type: "FeatureCollection" as const,
        features: [],
        attribution: "MAPBOX",
      };

      const spy = vi
        .spyOn(mapboxTool, "getReverseGeocodingData")
        .mockResolvedValueOnce(mockReverseGeocodeResponse);

      await mapboxTool.getRawData({ longitude: -122.4194, latitude: 37.7749 });
      expect(spy).toHaveBeenCalledWith({
        longitude: -122.4194,
        latitude: 37.7749,
      });
    });

    it("should call getDirections for origin/destination parameters", async () => {
      const mockDirectionsResponse = {
        routes: [],
        waypoints: [],
        code: "Ok",
        uuid: "abc123",
      };

      const geocodeSpy = vi
        .spyOn(mapboxTool, "geocodeLocation")
        .mockResolvedValueOnce([-122.4194, 37.7749])
        .mockResolvedValueOnce([-122.4, 37.8]);

      const directionsSpy = vi
        .spyOn(mapboxTool, "getDirections")
        .mockResolvedValueOnce(mockDirectionsResponse as any);

      await mapboxTool.getRawData({
        origin: "San Francisco",
        destination: "Oakland",
      });

      expect(geocodeSpy).toHaveBeenCalledTimes(2);
      expect(directionsSpy).toHaveBeenCalledWith({
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4, 37.8],
        ],
        profile: "driving",
        alternatives: undefined,
        avoid: undefined,
      });
    });

    it("should handle coordinate strings for origin/destination", async () => {
      const mockDirectionsResponse = {
        routes: [],
        waypoints: [],
        code: "Ok",
        uuid: "abc123",
      };

      const geocodeSpy = vi.spyOn(mapboxTool, "geocodeLocation");
      const directionsSpy = vi
        .spyOn(mapboxTool, "getDirections")
        .mockResolvedValueOnce(mockDirectionsResponse as any);

      await mapboxTool.getRawData({
        origin: "-122.4194,37.7749",
        destination: "-122.4,37.8",
      });

      // Geocode should not be called since we're using coordinate strings
      expect(geocodeSpy).not.toHaveBeenCalled();
      expect(directionsSpy).toHaveBeenCalledWith({
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4, 37.8],
        ],
        profile: "driving",
        alternatives: undefined,
        avoid: undefined,
      });
    });

    it("should handle mixed location types (coordinate string and place name)", async () => {
      const mockDirectionsResponse = {
        routes: [],
        waypoints: [],
        code: "Ok",
        uuid: "abc123",
      };

      const geocodeSpy = vi
        .spyOn(mapboxTool, "geocodeLocation")
        .mockResolvedValueOnce([-122.4, 37.8]);

      const directionsSpy = vi
        .spyOn(mapboxTool, "getDirections")
        .mockResolvedValueOnce(mockDirectionsResponse as any);

      await mapboxTool.getRawData({
        origin: "-122.4194,37.7749", // Coordinate string
        destination: "Oakland", // Place name
      });

      // Geocode should be called only once for the place name
      expect(geocodeSpy).toHaveBeenCalledTimes(1);
      expect(geocodeSpy).toHaveBeenCalledWith("Oakland");
      expect(directionsSpy).toHaveBeenCalledWith({
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4, 37.8],
        ],
        profile: "driving",
        alternatives: undefined,
        avoid: undefined,
      });
    });

    it("should handle invalid coordinate strings by falling back to geocoding", async () => {
      // Setup mocks for the fetch calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              features: [{ geometry: { coordinates: [-122.4194, 37.7749] } }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              features: [{ geometry: { coordinates: [-122.4, 37.8] } }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              routes: [],
              waypoints: [],
              code: "Ok",
              uuid: "abc123",
            }),
        });

      // This should not throw because it falls back to geocoding
      await mapboxTool.getRawData({
        origin: "invalid-coordinates",
        destination: "Oakland",
      });

      // Verify that fetch was called for both geocoding requests
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should throw error for invalid parameters", async () => {
      // @ts-ignore: Testing invalid parameters
      await expect(mapboxTool.getRawData({})).rejects.toThrow(
        "Invalid parameters"
      );
    });
  });
});
