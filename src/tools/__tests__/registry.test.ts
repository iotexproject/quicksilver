import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ToolRegistry } from "../registry";
import { Tool } from "../../types";

// Mock tools for testing
class MockToolA implements Tool {
  name = "MockToolA";
  description = "Mock Tool A for testing";
  output = "Mock output A";
  execute = vi.fn();
}

class MockToolB implements Tool {
  name = "MockToolB";
  description = "Mock Tool B for testing";
  output = "Mock output B";
  execute = vi.fn();
}

class FailingTool implements Tool {
  constructor() {
    throw new Error("Failed to initialize tool");
  }
  name = "FailingTool";
  description = "Tool that fails to initialize";
  output = "Never reached";
  execute = vi.fn();
}

describe("ToolRegistry", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Clear console warnings/errors for clean test output
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment after each test
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new tool factory", () => {
      ToolRegistry.register("mock-a", () => new MockToolA());
      expect(ToolRegistry.getAvailableTools()).toContain("mock-a");
    });
  });
  
  describe("getEnabledTools", () => {
    beforeEach(() => {
      ToolRegistry.register("mock-a", () => new MockToolA());
      ToolRegistry.register("mock-b", () => new MockToolB());
      ToolRegistry.register("failing", () => new FailingTool());
    });

    it("should return tools specified in ENABLED_TOOLS env var", () => {
      process.env.ENABLED_TOOLS = "mock-a,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });

    it("should handle spaces in ENABLED_TOOLS env var", () => {
      process.env.ENABLED_TOOLS = "mock-a, mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });

    it("should return empty array when ENABLED_TOOLS is not set", () => {
      delete process.env.ENABLED_TOOLS;
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(0);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("No tools enabled"),
      );
    });

    it("should ignore unknown tools and warn", () => {
      process.env.ENABLED_TOOLS = "mock-a,unknown-tool,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown tools configured: unknown-tool"),
      );
    });

    it("should handle tool initialization failures", () => {
      process.env.ENABLED_TOOLS = "mock-a,failing,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize tool failing"),
        expect.any(Error),
      );
    });

    it("should handle empty string in ENABLED_TOOLS", () => {
      process.env.ENABLED_TOOLS = "";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(0);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("No tools enabled"),
      );
    });

    it("should handle invalid format in ENABLED_TOOLS", () => {
      process.env.ENABLED_TOOLS = "mock-a,,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });
  });
});
