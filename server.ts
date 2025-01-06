import { BinoAI } from './src/binoai';
import { Hono } from 'hono'
const app = new Hono()

const binoai = new BinoAI();

app.post('/ask', async (c) => {
    const APIKEY = c.req.header("API-KEY")
    // TODO handle API
    const { query } = await c.req.json()
    const response = await binoai.agent.run(query);
    return c.json({ data: response })
})

export default {
    port: process.env.PORT || 8000,
    fetch: app.fetch,
}

// bun run server.ts