import { vi } from "vitest";

vi.stubEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY!);
vi.stubEnv("NUBILA_API_KEY", process.env.NUBILA_API_KEY!);
vi.stubEnv("NEWSAPI_API_KEY", process.env.NEWSAPI_API_KEY!);
vi.stubEnv("OPENWEATHER_API_KEY", process.env.OPENWEATHER_API_KEY!);