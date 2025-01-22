import { mockLLMService, mockWeatherTools } from "./mocks";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SentientAI } from "../SentientAI";

describe("SentientAI", () => {
  beforeEach(() => {
    vi.mock("../services/llm-service", () => mockLLMService);
    vi.mock("../tools/weatherapi", () => mockWeatherTools);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a response", async () => {
    const sentai = new SentientAI();
    const response = await sentai.agent.execute("Current temperature in SF?");
    expect(response).toBe("+10 C");
  });
});
