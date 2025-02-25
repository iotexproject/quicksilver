import { describe, it, expect } from "vitest";

import { finalResponseTemplate, toolSelectionTemplate } from ".";
import { APITool } from "../tools/tool";

class ToolWithTwitterAccount extends APITool<any> {
  constructor() {
    super({
      name: "ToolWithTwitterAccount",
      description: "ToolWithTwitterAccount",
      baseUrl: "https://api.nubila.ai/api/v1/",
      twitterAccount: "nubilanetwork",
    });
  }
  getRawData(input: string): Promise<any> {
    return Promise.resolve({});
  }
}

class ToolWithoutTwitterAccount extends APITool<any> {
  constructor() {
    super({
      name: "ToolWithoutTwitterAccount",
      description: "ToolWithoutTwitterAccount",
      baseUrl: "https://api.nubila.ai/api/v1/",
    });
  }
  getRawData(input: string): Promise<any> {
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

      expect(prompt).toContain("Current temperature in SF?");
      expect(prompt).toContain("ToolWithTwitterAccount");
      expect(prompt).toContain("+10 C");
      expect(prompt).toContain("nubilanetwork");
      expect(prompt).toContain("<response>");
    });

    it("should generate a prompt without twitter handle", () => {
      const prompt = finalResponseTemplate({
        tools: [new ToolWithoutTwitterAccount()],
        toolOutputs: ["+10 C"],
        input: "Current temperature in SF?",
      });

      expect(prompt).toContain("Current temperature in SF?");
      expect(prompt).toContain("ToolWithoutTwitterAccount");
      expect(prompt).toContain("+10 C");
      expect(prompt).not.toContain("nubilanetwork");
      expect(prompt).toContain("<response>");
    });

    it("should gen a prompt with multiple tools", () => {
      const prompt = finalResponseTemplate({
        tools: [new ToolWithTwitterAccount(), new ToolWithoutTwitterAccount()],
        toolOutputs: ["+10 C", "+10 C"],
        input: "Current temperature in SF?",
      });

      expect(prompt).toContain("Current temperature in SF?");
      expect(prompt).toContain("ToolWithTwitterAccount");
      expect(prompt).toContain("ToolWithoutTwitterAccount");
      expect(prompt).toContain("+10 C");
      expect(prompt).toContain("nubilanetwork");
      expect(prompt).toContain("<response>");
    });
  });
  describe("toolSelectionTemplate", () => {
    it("should generate a prompt with twitter handle", () => {
      const prompt = toolSelectionTemplate("Current temperature in SF?", [
        new ToolWithTwitterAccount(),
      ]);
      const name = new ToolWithTwitterAccount().name;
      const description = new ToolWithTwitterAccount().description;

      expect(prompt).toContain("Current temperature in SF?");
      expect(prompt).toContain(name);
      expect(prompt).toContain(description);
      expect(prompt).toContain("<response>");
    });
  });
});
