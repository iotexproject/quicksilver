import { BinoAI } from './src/binoai';
import { Hono } from 'hono'
const app = new Hono()


app.get("/", (c) => {
    return c.text("hello world!")
})

app.post('/ask', async (c) => {
    const binoai = new BinoAI();

    const APIKEY = c.req.header("API-KEY")
    // TODO handle API
    const content = c.req.query("content") || (await c.req.json()).content
    const response = await binoai.agent.run(content);
    return c.json({ data: response })
})

export default {
    port: process.env.PORT || 8000,
    fetch: app.fetch,
}

// bun run server.ts