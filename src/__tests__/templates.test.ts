import { describe, it, expect } from "vitest";

import { finalResponseTemplate, toolSelectionTemplate } from "../templates";
import { APITool } from "../tools/tool";

class ToolWithTwitterAccount extends APITool<any> {
  constructor() {
    super(
      "ToolWithTwitterAccount",
      "ToolWithTwitterAccount",
      "https://api.nubila.ai/api/v1/",
      "nubilanetwork",
    );
  }
  execute(input: string): Promise<string> {
    return Promise.resolve("ToolWithTwitterAccount");
  }
  parseInput(input: string): Promise<any> {
    return Promise.resolve({});
  }
}

class ToolWithoutTwitterAccount extends APITool<any> {
  constructor() {
    super(
      "ToolWithoutTwitterAccount",
      "ToolWithoutTwitterAccount",
      "https://api.nubila.ai/api/v1/",
    );
  }
  execute(input: string): Promise<string> {
    return Promise.resolve("ToolWithoutTwitterAccount");
  }
  parseInput(input: string): Promise<any> {
    return Promise.resolve({});
  }
}

describe("templates", () => {
  describe("finalResponseTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = finalResponseTemplate({
        tools: [new ToolWithTwitterAccount()],
        toolOutputs: ["+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: ToolWithTwitterAccount
Tool Outputs: +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork in the end.`);
    });
    it("should generate a prompt without twitter handle", () => {
      const prompt = finalResponseTemplate({
        tools: [new ToolWithoutTwitterAccount()],
        toolOutputs: ["+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: ToolWithoutTwitterAccount
Tool Outputs: +10 C

Generate a human-readable response based on the tool output`);
    });
    it("should gen a prompt with multiple tools", () => {
      const prompt = finalResponseTemplate({
        tools: [new ToolWithTwitterAccount(), new ToolWithoutTwitterAccount()],
        toolOutputs: ["+10 C", "+10 C"],
        input: "Current temperature in SF?",
      });
      expect(prompt).toBe(`
User Input: Current temperature in SF?
Tools Used: ToolWithTwitterAccount, ToolWithoutTwitterAccount
Tool Outputs: +10 C, +10 C

Generate a human-readable response based on the tool output and mention x handle nubilanetwork,  in the end.`);
    });
  });
  describe("toolSelectionTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = toolSelectionTemplate("Current temperature in SF?", [
        new ToolWithTwitterAccount(),
      ]);
      const name = new ToolWithTwitterAccount().name;
      const description = new ToolWithTwitterAccount().description;
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
