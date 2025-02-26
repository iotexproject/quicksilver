import { Hono } from "hono";

import { SentientAI } from "./src/sentientAI";
import { logger } from "./src/logger/winston";

const app = new Hono();

const sentai = new SentientAI();

app.get("/", (c) => {
  return c.text("hello world, Sentient AI!");
});

app.post("/ask", async (c) => {
  const apiKey = c.req.header("API-KEY");
  if (!apiKey) {
    logger.warn("no SENTAI API-KEY provided");
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
    console.log("error", e);
    logger.error("Error in /ask", { error: e });
    return c.json({ error: "Internal server error." }, 400);
  }
});

app.post("/stream", async (c) => {
  const apiKey = c.req.header("API-KEY");
  if (!apiKey) {
    logger.warn("no SENTAI API-KEY provided");
  }

  try {
    const formData = await c.req.formData();
    let content = formData.get("text");
    const recentMessages = formData.get("recentMessages");
    if (recentMessages) {
      content = recentMessages + "\n" + content;
    }
    return sentai.stream(content as string);
  } catch (e) {
    console.log("error", e);
    logger.error("Error in /stream", { error: e });
    return c.json({ error: "Internal server error." }, 400);
  }
});

app.get("/raw", async (c) => {
  const apiKey = c.req.header("API-KEY");
  if (!apiKey) {
    logger.warn("no SENTAI API-KEY provided");
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
    console.log("error", e);
    logger.error("Error in /raw", { error: e });
    return c.json({ error: e.message || "Internal server error" }, 500);
  }
});

export default {
  port: process.env.PORT || 8000,
  fetch: app.fetch,
};
