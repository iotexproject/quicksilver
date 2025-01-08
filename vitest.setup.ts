import { vi } from "vitest";

vi.stubEnv("OPENAI_API_KEY", "test-api-key");
vi.stubEnv("NUBILA_API_KEY", "test-nubila-api-key");
vi.stubEnv("NEWSAPI_API_KEY", "test-newsapi-api-key");