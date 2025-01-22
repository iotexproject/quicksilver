import { describe, it, expect } from "vitest";

import { finalResponseTemplate, toolSelectionTemplate } from "../templates";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../tools/weatherapi";

describe("templates", () => {
  describe("finalResponseTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = finalResponseTemplate({
        tool: new CurrentWeatherAPITool(),
        toolOutput: "+10 C",
        toolInput: '{"latitude": 37.7749, "longitude": -122.4194}',
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tool Used: CurrentWeatherAPITool
Tool Input: {"latitude": 37.7749, "longitude": -122.4194}
Tool Output: +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork in the end.`);
    });
    it("should generate a prompt without twitter handle", () => {
      const prompt = finalResponseTemplate({
        tool: new ForecastWeatherAPITool(),
        toolOutput: "+10 C",
        toolInput: '{"latitude": 37.7749, "longitude": -122.4194}',
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tool Used: ForecastWeatherAPITool
Tool Input: {"latitude": 37.7749, "longitude": -122.4194}
Tool Output: +10 C

Generate a human-readable response based on the tool output`);
    });
  });
  describe("toolSelectionTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = toolSelectionTemplate("Current temperature in SF?", [
        new CurrentWeatherAPITool(),
      ]);
      const name = new CurrentWeatherAPITool().name;
      const description = new CurrentWeatherAPITool().description;
      expect(prompt).toBe(`
Input: Current temperature in SF?

Available Tools: [{"name":"${name}","description":"${description}"}]

Only respond with a JSON object in the following format:
\`\`\`json
{
    "tool": "tool_name_or_null", // The name of the tool to use, or null if no tool is needed
    "tool_input": "input_for_the_tool" // The input to pass to the tool in json format (only if a tool is selected)
}
\`\`\`
If no tool is needed, set "tool" to null.
`);
    });
  });
});
