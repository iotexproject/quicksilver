import { Hono } from "hono";

import { SentientAI } from "./src/sentientAI";

const app = new Hono();

const sentai = new SentientAI();

app.get("/", (c) => {
  return c.text("hello world, Sentient AI!");
});

app.post("/ask", async (c) => {
  const apiKey = c.req.header("API-KEY");
  if (!apiKey) {
    console.warn("no SENTAI API-KEY provided");
  }
  try {
    let content = c.req.query("q") || c.req.query("content");
    if (!content) {
      const body = await c.req.json();
      content = body.q || body.content;
    }
    if (!content) {
      return c.json({ error: "question is required." }, 400);
    }

    const response = await sentai.execute(content);
    return c.json({ data: response });
  } catch (e) {
    console.error(e);
    return c.json({ error: "Internal server error." }, 400);
  }
});

app.get("/raw", async (c) => {
  const apiKey = c.req.header("API-KEY");
  if (!apiKey) {
    console.warn("no SENTAI API-KEY provided");
  }

  try {
    const toolName = c.req.query("tool");
    if (!toolName) {
      return c.json({ error: "tool parameter is required" }, 400);
    }

    // Get all query parameters and pass them as params
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(c.req.query())) {
      if (key !== "tool") {
        params[key] = value;
      }
    }

    const rawData = await sentai.getRawData(toolName, params);
    return c.json({ data: rawData });
  } catch (e: any) {
    console.error(e);
    return c.json({ error: e.message || "Internal server error" }, 500);
  }
});

export default {
  port: process.env.PORT || 8000,
  fetch: app.fetch,
};
