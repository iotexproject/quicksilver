import { describe, expect, it } from "vitest";
import { WeatherTool } from "../src/tools/weatherapi";
import * as dotenv from "dotenv";

dotenv.config();

describe("weatherTool", () => {
  it("should return weather forecast data for Beijing", async () => {
    const weatherTool = new WeatherTool(process.env.OPENWEATHER_API_KEY!);
    const input = "What's the future weather in London?";
    console.log(`🚀 ~ it ~ input:`, input);
    const result = await weatherTool.execute(input);
    console.log(`🚀 ~ it ~ result:`, result);
    expect(result).toContain("London");
  });
}, 10000);
