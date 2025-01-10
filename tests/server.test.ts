import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import app from "../server";

describe("Server", () => {
  let testApp = app.fetch;

  beforeEach(() => {
    vi.mock("../src/SentientAI", () => ({
      SentientAI: vi.fn().mockImplementation(() => ({
        agent: new (class {
          async run(_: string): Promise<string> {
            return "mocked response";
          }
        })(),
      })),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return hello world on GET /", async () => {
    const req = new Request("http://localhost");
    const res = await testApp(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("hello world, Sentient AI!");
  });

  it("should accept content via query param q in POST /ask", async () => {
    const req = new Request("http://localhost/ask?q=test question", {
      method: "POST",
    });
    const res = await testApp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBe("mocked response");
  }, 10000);

  it("should accept content via query param content in POST /ask", async () => {
    const req = new Request("http://localhost/ask?content=test question", {
      method: "POST",
    });
    const res = await testApp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBe("mocked response");
  }, 10000);

  it("should accept content via JSON body.content in POST /ask", async () => {
    const req = new Request("http://localhost/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "test question",
      }),
    });
    const res = await testApp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBe("mocked response");
  }, 10000);

  it("should accept content via JSON body.q in POST /ask", async () => {
    const req = new Request("http://localhost/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: "test question",
      }),
    });
    const res = await testApp(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBe("mocked response");
  }, 10000);

  it("should log warning when no API key provided", async () => {
    const consoleSpy = vi.spyOn(console, "warn");
    const req = new Request("http://localhost/ask?q=test", {
      method: "POST",
    });
    await testApp(req);
    expect(consoleSpy).toHaveBeenCalledWith("no SENTAI API-KEY provided");
    consoleSpy.mockRestore();
  });

  it("should fail when no json body in POST /ask", async () => {
    const req = new Request("http://localhost/ask", {
      method: "POST",
    });
    const res = await testApp(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Internal server error.");
  });

  it("should fail when no content in POST /ask", async () => {
    const req = new Request("http://localhost/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const res = await testApp(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("question is required.");
  });
});
