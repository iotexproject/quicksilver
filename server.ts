import { Hono } from "hono";

import { SentientAI } from "./src/SentientAI";

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

    const response = await sentai.agent.execute(content);
    return c.json({ data: response });
  } catch (e) {
    return c.json({ error: "Internal server error." }, 400);
  }
});

export default {
  port: process.env.PORT || 8000,
  fetch: app.fetch,
};
