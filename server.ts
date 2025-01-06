import { SentientAI } from './src/SentientAI ';
import { Hono } from 'hono'
const app = new Hono()

const sentai = new SentientAI();

app.get("/", (c) => {
    return c.text("hello world, Sentient AI!")
})

app.post('/ask', async (c) => {

    const apiKey = c.req.header("API-KEY")
    if (!apiKey) {
        console.warn('no API-KEY provided');
    }
    let content;
    try {
        content = c.req.query("q") ||
            (await c.req.json()).q ||
            c.req.query("content") || 
            (await c.req.json()).content;
    } catch (e) {
        return c.json({ error: "a question is required."});
    }
    const response = await sentai.agent.run(content);
    return c.json({ data: response });
})

export default {
    port: process.env.PORT || 8000,
    fetch: app.fetch,
}

// bun run server.ts