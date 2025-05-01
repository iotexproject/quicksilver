import { Tool } from 'ai';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { logger } from '../../logger/winston';
import { ToolName } from '../../registry/toolNames';
import { QSTool } from '../../types';
import { ToolRegistry } from '../registry';

const mockToolSchema: { name: string; tool: Tool } = {
  name: 'Test Tool',
  tool: vi.fn().mockResolvedValue('test') as unknown as Tool,
};

// Mock tools for testing
class MockToolA implements QSTool {
  name = ToolName.CALCULATOR;
  description = 'Mock Tool A for testing';
  output = 'Mock output A';
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
  execute = vi.fn();
}

class MockToolB implements QSTool {
  name = ToolName.MAPBOX;
  description = 'Mock Tool B for testing';
  output = 'Mock output B';
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
  execute = vi.fn();
}

class FailingTool implements QSTool {
  schema: { name: string; tool: Tool }[] = [mockToolSchema];
  constructor() {
    throw new Error('Failed to initialize tool');
  }
  name = ToolName.DIMO;
  description = 'Tool that fails to initialize';
  output = 'Never reached';
  execute = vi.fn();
}

describe('ToolRegistry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Clear console warnings/errors for clean test output
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  afterEach(() => {
    // Restore environment after each test
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new tool factory', () => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
      expect(ToolRegistry.getAvailableTools()).toContain(ToolName.CALCULATOR);
    });
  });

  describe('getEnabledTools', () => {
    beforeEach(() => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
      ToolRegistry.register(ToolName.MAPBOX, () => new MockToolB());
      ToolRegistry.register(ToolName.DIMO, () => new FailingTool());
    });

    it('should return tools specified in ENABLED_TOOLS env var', () => {
      process.env.ENABLED_TOOLS = 'calculator,mapbox';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });

    it('should handle spaces in ENABLED_TOOLS env var', () => {
      process.env.ENABLED_TOOLS = 'calculator, mapbox';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });

    it('should return empty array when ENABLED_TOOLS is not set', () => {
      delete process.env.ENABLED_TOOLS;
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No tools enabled'));
    });

    it('should ignore unknown tools and warn', () => {
      process.env.ENABLED_TOOLS = 'calculator,unknown-tool,mapbox';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown tools configured: unknown-tool'));
    });

    it('should handle tool initialization failures', () => {
      process.env.ENABLED_TOOLS = 'calculator,dimo,mapbox';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize tool dimo'),
        expect.any(Error)
      );
    });

    it('should handle empty string in ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = '';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No tools enabled'));
    });

    it('should handle invalid format in ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = 'calculator,,mapbox';
      const enabled = ToolRegistry.getEnabledTools();

      expect(enabled).toHaveLength(2);
      expect(enabled[0]).toBeInstanceOf(MockToolA);
      expect(enabled[1]).toBeInstanceOf(MockToolB);
    });
  });

  describe('getTool', () => {
    beforeEach(() => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
      ToolRegistry.register(ToolName.DIMO, () => new FailingTool());
    });

    it('should return an instance of the requested tool', () => {
      const tool = ToolRegistry.getTool(ToolName.CALCULATOR);
      expect(tool).toBeInstanceOf(MockToolA);
    });

    it('should return undefined for unknown tool', () => {
      // Use a special mock name that is guaranteed not to be registered
      const UNKNOWN_TOOL = 'unknown-tool-name' as unknown as ToolName;
      const tool = ToolRegistry.getTool(UNKNOWN_TOOL);
      expect(tool).toBeUndefined();
    });

    it('should return undefined when tool initialization fails', () => {
      const tool = ToolRegistry.getTool(ToolName.DIMO);
      expect(tool).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize tool dimo'),
        expect.any(Error)
      );
    });
  });

  describe('isEnabled', () => {
    beforeEach(() => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
    });

    it('should return true for enabled tool', () => {
      process.env.ENABLED_TOOLS = 'calculator,mapbox';
      expect(ToolRegistry.isEnabled(ToolName.CALCULATOR)).toBe(true);
    });

    it('should return false for non-enabled tool', () => {
      process.env.ENABLED_TOOLS = 'mapbox';
      expect(ToolRegistry.isEnabled(ToolName.CALCULATOR)).toBe(false);
    });

    it('should return false when ENABLED_TOOLS is not set', () => {
      delete process.env.ENABLED_TOOLS;
      expect(ToolRegistry.isEnabled(ToolName.CALCULATOR)).toBe(false);
    });

    it('should handle spaces in ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = 'mapbox, calculator';
      expect(ToolRegistry.isEnabled(ToolName.CALCULATOR)).toBe(true);
    });
  });

  describe('getSpecialtyTools', () => {
    beforeEach(() => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
      ToolRegistry.register(ToolName.MAPBOX, () => new MockToolB());
      ToolRegistry.register(ToolName.DIMO, () => new FailingTool());
    });

    it('should return all requested tools that exist', () => {
      const tools = ToolRegistry.getSpecialtyTools([ToolName.CALCULATOR, ToolName.MAPBOX]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
    });

    it('should filter out undefined tools', () => {
      // Use a special mock name that is guaranteed not to be registered
      const UNKNOWN_TOOL = 'unknown-tool-name' as unknown as ToolName;
      const tools = ToolRegistry.getSpecialtyTools([ToolName.CALCULATOR, UNKNOWN_TOOL, ToolName.MAPBOX]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
    });

    it('should handle failing tool initialization', () => {
      const tools = ToolRegistry.getSpecialtyTools([ToolName.CALCULATOR, ToolName.DIMO, ToolName.MAPBOX]);
      expect(tools).toHaveLength(2);
      expect(tools[0]).toBeInstanceOf(MockToolA);
      expect(tools[1]).toBeInstanceOf(MockToolB);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize tool dimo'),
        expect.any(Error)
      );
    });

    it('should return empty array when no tools exist', () => {
      // Use special mock names that are guaranteed not to be registered
      const UNKNOWN_TOOL_1 = 'unknown-tool-name-1' as unknown as ToolName;
      const UNKNOWN_TOOL_2 = 'unknown-tool-name-2' as unknown as ToolName;
      const tools = ToolRegistry.getSpecialtyTools([UNKNOWN_TOOL_1, UNKNOWN_TOOL_2]);
      expect(tools).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const tools = ToolRegistry.getSpecialtyTools([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe('buildToolSet', () => {
    beforeEach(() => {
      ToolRegistry.register(ToolName.CALCULATOR, () => new MockToolA());
      ToolRegistry.register(ToolName.MAPBOX, () => new MockToolB());
    });

    it('should build tool set from array of tools', () => {
      const tools = [ToolRegistry.getTool(ToolName.CALCULATOR)!, ToolRegistry.getTool(ToolName.MAPBOX)!];
      const toolSet = ToolRegistry.buildToolSet(tools);

      expect(toolSet).toHaveProperty('Test Tool');
      expect(toolSet['Test Tool']).toBeDefined();
      expect(typeof toolSet['Test Tool']).toBe('function');
    });

    it('should handle empty array of tools', () => {
      const toolSet = ToolRegistry.buildToolSet([]);
      expect(toolSet).toEqual({});
    });

    it('should handle tools with multiple schemas', () => {
      class MultiSchemaTool implements QSTool {
        name = 'MultiSchemaTool';
        description = 'Tool with multiple schemas';
        output = 'Mock output';
        schema: { name: string; tool: Tool }[] = [
          { name: 'Schema1', tool: vi.fn() as unknown as Tool },
          { name: 'Schema2', tool: vi.fn() as unknown as Tool },
        ];
        execute = vi.fn();
      }

      const multiSchemaTool = new MultiSchemaTool();
      const toolSet = ToolRegistry.buildToolSet([multiSchemaTool]);

      expect(toolSet).toHaveProperty('Schema1');
      expect(toolSet).toHaveProperty('Schema2');
      expect(toolSet['Schema1']).toBeDefined();
      expect(toolSet['Schema2']).toBeDefined();
    });

    it('should handle tools with no schemas', () => {
      class NoSchemaTool implements QSTool {
        name = ToolName.NUCLEAR;
        description = 'Tool with no schemas';
        output = 'Mock output';
        schema: { name: string; tool: Tool }[] = [];
        execute = vi.fn();
      }

      const noSchemaTool = new NoSchemaTool();
      const toolSet = ToolRegistry.buildToolSet([noSchemaTool]);

      expect(toolSet).toEqual({});
    });
  });

  describe('registerMcpTools', () => {
    const mockTool = vi.fn();
    const mockServer = { tool: mockTool };
    let mockExecute: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Reset the mocks
      vi.clearAllMocks();
      mockTool.mockClear();

      // Mock execute function
      mockExecute = vi.fn().mockResolvedValue({ result: 'success' });

      // Set up mock tools with actual schemas
      class TestTool implements QSTool {
        name = ToolName.CALCULATOR;
        description = 'Test tool with multiple schemas';
        output = 'Test output';
        execute = mockExecute;
        schema = [
          {
            name: 'schema1',
            tool: {
              description: 'Schema 1 description',
              parameters: { shape: { param1: { type: 'string' } } },
              execute: mockExecute,
            } as unknown as Tool,
          },
          {
            name: 'schema2',
            tool: {
              description: 'Schema 2 description',
              parameters: { shape: { param2: { type: 'number' } } },
              execute: mockExecute,
            } as unknown as Tool,
          },
        ];
      }

      // Register the test tool
      ToolRegistry.register(ToolName.CALCULATOR, () => new TestTool());
    });

    it('should register all enabled tools with the MCP server', () => {
      // Set up environment to enable the test tool
      process.env.ENABLED_TOOLS = 'calculator';

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Verify the server.tool method was called for each schema
      expect(mockTool).toHaveBeenCalledTimes(2);

      // Verify first schema registration
      expect(mockTool).toHaveBeenCalledWith(
        'schema1',
        'Schema 1 description',
        { param1: { type: 'string' } },
        expect.any(Function)
      );

      // Verify second schema registration
      expect(mockTool).toHaveBeenCalledWith(
        'schema2',
        'Schema 2 description',
        { param2: { type: 'number' } },
        expect.any(Function)
      );
    });

    it('should handle tools with no schemas', () => {
      // Register a tool with empty schema
      class EmptySchemaTool implements QSTool {
        name = ToolName.MAPBOX;
        description = 'Tool with empty schema';
        output = 'Empty output';
        execute = vi.fn();
        schema: { name: string; tool: Tool }[] = [];
      }

      ToolRegistry.register(ToolName.MAPBOX, () => new EmptySchemaTool());
      process.env.ENABLED_TOOLS = 'mapbox';

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Verify server.tool was not called
      expect(mockTool).not.toHaveBeenCalled();
    });

    it('should use default execute function when not provided', () => {
      // Register a tool with schema missing execute function
      class NoExecuteTool implements QSTool {
        name = ToolName.DIMO;
        description = 'Tool without execute function';
        output = 'No execute';
        execute = vi.fn();
        schema = [
          {
            name: 'missing-execute',
            tool: {
              description: 'Schema without execute',
              parameters: { shape: {} },
            } as unknown as Tool,
          },
        ];
      }

      ToolRegistry.register(ToolName.DIMO, () => new NoExecuteTool());
      process.env.ENABLED_TOOLS = 'dimo';

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Verify server.tool was called
      expect(mockTool).toHaveBeenCalledTimes(1);
      expect(mockTool).toHaveBeenCalledWith('missing-execute', 'Schema without execute', {}, expect.any(Function));
    });

    it('should use empty string as default description', () => {
      // Register a tool with schema missing description
      class NoDescriptionTool implements QSTool {
        name = ToolName.NEWS;
        description = 'Tool without description';
        output = 'No description';
        execute = vi.fn();
        schema = [
          {
            name: 'missing-description',
            tool: {
              parameters: { shape: {} },
              execute: vi.fn(),
            } as unknown as Tool,
          },
        ];
      }

      ToolRegistry.register(ToolName.NEWS, () => new NoDescriptionTool());
      process.env.ENABLED_TOOLS = 'news';

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Verify server.tool was called with empty description
      expect(mockTool).toHaveBeenCalledTimes(1);
      expect(mockTool).toHaveBeenCalledWith('missing-description', '', {}, expect.any(Function));
    });

    it('should correctly execute the tool callback and format the response', async () => {
      // Set up environment to enable the test tool
      process.env.ENABLED_TOOLS = 'calculator';

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Extract the callback function passed to server.tool
      const callback = mockTool.mock.calls[0][3];

      // Call the callback with test arguments
      const result = await callback({ testArg: 'value' }, {});

      // Verify execute was called with correct arguments
      expect(mockExecute).toHaveBeenCalledWith(
        { testArg: 'value' },
        {
          toolCallId: '',
          messages: [],
        }
      );

      // Verify response format
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify({ result: 'success' }) }],
      });
    });

    it('should not register any tools when no tools are enabled', () => {
      // Set up environment with no enabled tools
      delete process.env.ENABLED_TOOLS;

      // Call the method under test
      ToolRegistry.registerMcpTools(mockServer as any);

      // Verify server.tool was not called
      expect(mockTool).not.toHaveBeenCalled();
    });
  });
});
