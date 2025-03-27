import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ToolRegistry } from "../registry";
import { QSTool } from "../../types";
import { logger } from "../../logger/winston";
import { Tool } from "ai";

const mockToolSchema: { name: string; tool: Tool } = {
  name: "Test Tool",
  tool: vi.fn().mockResolvedValue("test") as unknown as Tool,
};

// Mock tools for testing
class MockToolA implements QSTool {
  name = "MockToolA";
  description = "Mock Tool A for testing";
  output = "Mock output A";
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
  execute = vi.fn();
}

class MockToolB implements QSTool {
  name = "MockToolB";
  description = "Mock Tool B for testing";
  output = "Mock output B";
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
  execute = vi.fn();
}

class FailingTool implements QSTool {
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
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
    vi.spyOn(logger, "warn").mockImplementation(() => logger);
    vi.spyOn(logger, "error").mockImplementation(() => logger);
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
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No tools enabled")
      );
    });

    it("should ignore unknown tools and warn", () => {
      process.env.ENABLED_TOOLS = "mock-a,unknown-tool,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown tools configured: unknown-tool")
      );
    });

    it("should handle tool initialization failures", () => {
      process.env.ENABLED_TOOLS = "mock-a,failing,mock-b";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize tool failing"),
        expect.any(Error)
      );
    });

    it("should handle empty string in ENABLED_TOOLS", () => {
      process.env.ENABLED_TOOLS = "";
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No tools enabled")
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

  describe("getTool", () => {
    beforeEach(() => {
      ToolRegistry.register("mock-a", () => new MockToolA());
      ToolRegistry.register("failing", () => new FailingTool());
    });

    it("should return an instance of the requested tool", () => {
      const tool = ToolRegistry.getTool("mock-a");
      expect(tool).toBeInstanceOf(MockToolA);
    });

    it("should return undefined for unknown tool", () => {
      const tool = ToolRegistry.getTool("unknown-tool");
      expect(tool).toBeUndefined();
    });

    it("should return undefined when tool initialization fails", () => {
      const tool = ToolRegistry.getTool("failing");
      expect(tool).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize tool failing"),
        expect.any(Error)
      );
    });
  });

  describe("isEnabled", () => {
    beforeEach(() => {
      ToolRegistry.register("mock-a", () => new MockToolA());
    });

    it("should return true for enabled tool", () => {
      process.env.ENABLED_TOOLS = "mock-a,mock-b";
      expect(ToolRegistry.isEnabled("mock-a")).toBe(true);
    });

    it("should return false for non-enabled tool", () => {
      process.env.ENABLED_TOOLS = "mock-b";
      expect(ToolRegistry.isEnabled("mock-a")).toBe(false);
    });

    it("should return false when ENABLED_TOOLS is not set", () => {
      delete process.env.ENABLED_TOOLS;
      expect(ToolRegistry.isEnabled("mock-a")).toBe(false);
    });

    it("should handle spaces in ENABLED_TOOLS", () => {
      process.env.ENABLED_TOOLS = "mock-b, mock-a";
      expect(ToolRegistry.isEnabled("mock-a")).toBe(true);
    });
  });

  describe("getSpecialtyTools", () => {
    beforeEach(() => {
      ToolRegistry.register("mock-a", () => new MockToolA());
      ToolRegistry.register("mock-b", () => new MockToolB());
      ToolRegistry.register("failing", () => new FailingTool());
    });

    it("should return all requested tools that exist", () => {
      const tools = ToolRegistry.getSpecialtyTools(["mock-a", "mock-b"]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
    });

    it("should filter out undefined tools", () => {
      const tools = ToolRegistry.getSpecialtyTools([
        "mock-a",
        "unknown-tool",
        "mock-b",
      ]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
    });

    it("should handle failing tool initialization", () => {
      const tools = ToolRegistry.getSpecialtyTools([
        "mock-a",
        "failing",
        "mock-b",
      ]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to initialize tool failing"),
        expect.any(Error)
      );
    });

    it("should return empty array when no tools exist", () => {
      const tools = ToolRegistry.getSpecialtyTools([
        "unknown-tool-1",
        "unknown-tool-2",
      ]);
      expect(tools).toHaveLength(0);
    });

    it("should return empty array for empty input", () => {
      const tools = ToolRegistry.getSpecialtyTools([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe("buildToolSet", () => {
    beforeEach(() => {
      ToolRegistry.register("mock-a", () => new MockToolA());
      ToolRegistry.register("mock-b", () => new MockToolB());
    });

    it("should build tool set from array of tools", () => {
      const tools = [
        ToolRegistry.getTool("mock-a")!,
        ToolRegistry.getTool("mock-b")!,
      ];
      const toolSet = ToolRegistry.buildToolSet(tools);

      expect(toolSet).toHaveProperty("Test Tool");
      expect(toolSet["Test Tool"]).toBeDefined();
      expect(typeof toolSet["Test Tool"]).toBe("function");
    });

    it("should handle empty array of tools", () => {
      const toolSet = ToolRegistry.buildToolSet([]);
      expect(toolSet).toEqual({});
    });

    it("should handle tools with multiple schemas", () => {
      class MultiSchemaTool implements QSTool {
        name = "MultiSchemaTool";
        description = "Tool with multiple schemas";
        output = "Mock output";
        schema: { name: string; tool: Tool }[] = [
          { name: "Schema1", tool: vi.fn() as unknown as Tool },
          { name: "Schema2", tool: vi.fn() as unknown as Tool },
        ];
        execute = vi.fn();
      }

      const multiSchemaTool = new MultiSchemaTool();
      const toolSet = ToolRegistry.buildToolSet([multiSchemaTool]);

      expect(toolSet).toHaveProperty("Schema1");
      expect(toolSet).toHaveProperty("Schema2");
      expect(toolSet["Schema1"]).toBeDefined();
      expect(toolSet["Schema2"]).toBeDefined();
    });

    it("should handle tools with no schemas", () => {
      class NoSchemaTool implements QSTool {
        name = "NoSchemaTool";
        description = "Tool with no schemas";
        output = "Mock output";
        schema: { name: string; tool: Tool }[] = [];
        execute = vi.fn();
      }

      const noSchemaTool = new NoSchemaTool();
      const toolSet = ToolRegistry.buildToolSet([noSchemaTool]);

      expect(toolSet).toEqual({});
    });
  });
});
