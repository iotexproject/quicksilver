import { Hono } from 'hono';
import { paymentMiddleware } from 'x402-hono';

import { logger } from './src/logger/winston';
import { SentientAI } from './src/sentientAI';

const app = new Hono();

const sentai = new SentientAI();

const X402_PAYMENT_RECEIVER = process.env.X402_PAYMENT_RECEIVER || '';
const X402_PRICE_FOR_PROTECTED_ROUTE_USDC = process.env.X402_PRICE_FOR_PROTECTED_ROUTE_USDC || '$0.1';
const X402_NETWORK = process.env.X402_NETWORK || 'iotex';
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'http://localhost:8001/facilitator';

const routePaymentConfig = {
  price: X402_PRICE_FOR_PROTECTED_ROUTE_USDC,
  network: X402_NETWORK,
  config: {
    description: 'Access to quicksilver',
  },
};

app.use(
  paymentMiddleware(
    X402_PAYMENT_RECEIVER,
    {
      '/ask': routePaymentConfig,
      '/stream': routePaymentConfig,
    },
    {
      url: X402_FACILITATOR_URL,
    }
  )
);

app.get('/', c => {
  return c.text('hello world, Sentient AI!');
});

app.post('/ask', async c => {
  const apiKey = c.req.header('API-KEY');
  if (!apiKey) {
    logger.warn('no SENTAI API-KEY provided');
  }
  try {
    let content = c.req.query('q') || c.req.query('content');
    if (!content) {
      const body = await c.req.json();
      content = body.q || body.content;
    }
    if (!content) {
      return c.json({ error: 'question is required.' }, 400);
    }

    const response = await sentai.execute(content);
    return c.json({ data: response });
  } catch (e) {
    console.log('error', e);
    logger.error('Error in /ask', { error: e });
    return c.json({ error: 'Internal server error.' }, 400);
  }
});

app.post('/stream', async c => {
  const apiKey = c.req.header('API-KEY');
  if (!apiKey) {
    logger.warn('no SENTAI API-KEY provided');
  }

  try {
    const formData = await c.req.formData();
    let content = formData.get('text');
    const recentMessages = formData.get('recentMessages');
    if (recentMessages) {
      content = recentMessages + '\n' + content;
    }
    return sentai.stream(content as string);
  } catch (e) {
    console.log('error', e);
    logger.error('Error in /stream', { error: e });
    return c.json({ error: 'Internal server error.' }, 400);
  }
});

app.get('/raw', async c => {
  const apiKey = c.req.header('API-KEY');
  if (!apiKey) {
    logger.warn('no SENTAI API-KEY provided');
  }

  try {
    const toolName = c.req.query('tool');
    if (!toolName) {
      return c.json({ error: 'tool parameter is required' }, 400);
    }

    // Get all query parameters and pass them as params
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(c.req.query())) {
      if (key !== 'tool') {
        params[key] = value;
      }
    }

    const rawData = await sentai.getRawData(toolName, params);
    return c.json({ data: rawData });
  } catch (e: any) {
    console.log('error', e);
    logger.error('Error in /raw', { error: e });
    return c.json({ error: e.message || 'Internal server error' }, 500);
  }
});

export default {
  port: process.env.PORT || 8000,
  fetch: app.fetch,
  idleTimeout: 120,
};
