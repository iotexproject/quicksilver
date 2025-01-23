import { describe, it, expect } from "vitest";

import { finalResponseTemplate, toolSelectionTemplate } from "../templates";
import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "../tools/weather/nubila";

describe("templates", () => {
  describe("finalResponseTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = finalResponseTemplate({
        tools: [new CurrentWeatherAPITool()],
        toolOutputs: ["+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: CurrentWeatherAPITool
Tool Outputs: +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork in the end.`);
    });
    it("should generate a prompt without twitter handle", () => {
      const prompt = finalResponseTemplate({
        tools: [new ForecastWeatherAPITool()],
        toolOutputs: ["+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: ForecastWeatherAPITool
Tool Outputs: +10 C

Generate a human-readable response based on the tool output`);
    });
    it("should gen a prompt with multiple tools", () => {
      const prompt = finalResponseTemplate({
        tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
        toolOutputs: ["+10 C", "+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: CurrentWeatherAPITool, ForecastWeatherAPITool
Tool Outputs: +10 C, +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork,  in the end.`);
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

Select necessary tools to respond the user query and return a list of tool names.
If no tool is needed, return an empty list.

<tool_selection>
["tool_name1", "tool_name2", "tool_name3"]
</tool_selection>
`);
    });
  });
});
