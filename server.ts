import { BinoAI } from './src/binoai';
import { Hono } from 'hono'
const app = new Hono()

const binoai = new BinoAI();

app.post('/binoai', async (c) => {
    const { query } = await c.req.json()
    console.log(query)
    const response = await binoai.agent.run(query);
    return c.json({ data: response })
})

export default {
    port: 8000,
    fetch: app.fetch,
}

// bun run server.ts