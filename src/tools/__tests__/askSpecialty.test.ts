import { mockLLMService } from "../../__tests__/mocks";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AskSpecialtyTool } from "../askSpecialty";
import { LLMService } from "../../llm/llm-service";
import { ToolRegistry } from "../../registry/registry";
import { QueryOrchestrator } from "../../workflow";
import { ToolName } from "../../registry/toolNames";
import { DomainName } from "../specialtyDomains";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

// Mock dependencies
vi.mock("../../registry/registry", () => ({
  ToolRegistry: {
    getSpecialtyTools: vi.fn(),
    buildToolSet: vi.fn(),
  },
}));

vi.mock("../../workflow", () => ({
  QueryOrchestrator: vi.fn(),
}));

vi.mock("../../llm/llm-service", () => mockLLMService);

describe("AskSpecialtyTool", () => {
  let askSpecialtyTool: AskSpecialtyTool;
  let mockOrchestrator: any;

  beforeEach(() => {
    askSpecialtyTool = new AskSpecialtyTool();

    // Reset mocks
    vi.clearAllMocks();

    // Setup mock orchestrator
    mockOrchestrator = {
      process: vi.fn(),
    };
    (QueryOrchestrator as any).mockImplementation(() => mockOrchestrator);
  });

  it("should initialize with correct properties", () => {
    expect(askSpecialtyTool.name).toBe("ask_specialty");
    expect(askSpecialtyTool.description).toContain(
      "Routes queries to specialized domain agents"
    );
    expect(askSpecialtyTool.schema).toHaveLength(1);
    expect(askSpecialtyTool.schema[0].name).toBe("ask_specialty");
  });

  describe("execute", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    beforeEach(() => {
      // Setup default mock responses
      (ToolRegistry.getSpecialtyTools as any).mockReturnValue([
        ToolName.CMC,
        ToolName.DEFILLAMA,
      ]);
      (ToolRegistry.buildToolSet as any).mockReturnValue({});
      mockOrchestrator.process.mockResolvedValue("Mock response");
    });

    it("should successfully process a valid domain query", async () => {
      const result = await askSpecialtyTool.schema[0].tool.execute(
        {
          domain: DomainName.BLOCKCHAIN,
          question: "What's the price of ETH?",
        },
        executionOptions
      );

      expect(result).toEqual({
        domain: DomainName.BLOCKCHAIN,
        response: "Mock response",
      });

      expect(ToolRegistry.getSpecialtyTools).toHaveBeenCalledWith([
        ToolName.DEPIN_METRICS,
        ToolName.DEPIN_PROJECTS,
        ToolName.L1DATA,
        ToolName.THIRDWEB,
      ]);
      expect(ToolRegistry.buildToolSet).toHaveBeenCalled();
      expect(mockOrchestrator.process).toHaveBeenCalledWith(
        "What's the price of ETH?"
      );
    });

    it("should handle non-existent domain", async () => {
      const result = await askSpecialtyTool.schema[0].tool.execute(
        {
          domain: "nonexistent",
          question: "Some question",
        },
        executionOptions
      );

      expect(result).toContain("Domain 'nonexistent' not found");
      expect(ToolRegistry.getSpecialtyTools).not.toHaveBeenCalled();
    });

    it("should handle domain with no available tools", async () => {
      (ToolRegistry.getSpecialtyTools as any).mockReturnValue([]);

      const result = await askSpecialtyTool.schema[0].tool.execute(
        {
          domain: DomainName.BLOCKCHAIN,
          question: "Some question",
        },
        executionOptions
      );

      expect((result as string).toLowerCase()).toBe(
        (
          "No tools available for domain: " + DomainName.BLOCKCHAIN
        ).toLowerCase()
      );
      expect(ToolRegistry.buildToolSet).not.toHaveBeenCalled();
      expect(mockOrchestrator.process).not.toHaveBeenCalled();
    });

    it("should handle orchestrator errors", async () => {
      mockOrchestrator.process.mockRejectedValue(
        new Error("Processing failed")
      );

      const result = await askSpecialtyTool.schema[0].tool.execute(
        {
          domain: DomainName.BLOCKCHAIN,
          question: "Some question",
        },
        executionOptions
      );

      expect(result).toBe(
        "Error executing ask_specialty tool for domain: " +
          DomainName.BLOCKCHAIN
      );
    });

    it("should validate domain parameter against available domains", async () => {
      const invalidDomain = "invalid_domain";
      const result = await askSpecialtyTool.schema[0].tool.execute(
        {
          domain: invalidDomain,
          question: "Some question",
        },
        executionOptions
      );

      expect(result).toContain("Domain 'invalid_domain' not found");
      expect(result).toContain("Available domains:");
    });
  });
});
