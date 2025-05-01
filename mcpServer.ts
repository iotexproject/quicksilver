import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

import { addMCPTools } from 'mcp/initTools';

const app = new Hono();

class HonoSSETransport implements Transport {
  sessionId: string;
  private sseStream: any; // Hono SSE stream type
  private endpoint: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(endpoint: string, stream: any) {
    this.endpoint = endpoint;
    this.sessionId = crypto.randomUUID();
    this.sseStream = stream;
  }

  async start(): Promise<void> {
    // Send initial ping
    await this.sseStream.writeSSE({ data: 'ping', event: 'heartbeat' });

    // Send endpoint information
    await this.sseStream.writeSSE({
      data: `${encodeURI(this.endpoint)}?sessionId=${this.sessionId}`,
      event: 'endpoint',
    });
  }

  async handlePostMessage(request: Request): Promise<Response> {
    if (!this.sseStream) {
      return new Response('SSE connection not established', { status: 500 });
    }

    try {
      const contentType = request.headers.get('content-type');
      if (contentType !== 'application/json') {
        throw new Error(`Unsupported content-type: ${contentType}`);
      }

      const body = await request.json();
      let parsedMessage: JSONRPCMessage;

      try {
        parsedMessage = JSONRPCMessageSchema.parse(body);
      } catch (error) {
        this.onerror?.(error as Error);
        throw error;
      }

      this.onmessage?.(parsedMessage);
      return new Response('Accepted', { status: 202 });
    } catch (error) {
      this.onerror?.(error as Error);
      return new Response(String(error), { status: 400 });
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.sseStream) {
      throw new Error('Not connected');
    }

    await this.sseStream.writeSSE({
      data: JSON.stringify(message),
      event: 'message',
    });
  }

  get id(): string {
    return this.sessionId;
  }
}

// Create server instance
const server = new McpServer({
  name: 'weather',
  version: '1.0.0',
  capabilities: {
    tools: {},
  },
});

addMCPTools(server);

// Store active transports by session ID
const transports: Record<string, HonoSSETransport> = {};

app.get('/sse', c => {
  return streamSSE(c, async stream => {
    const transport = new HonoSSETransport('/messages', stream);

    // Store the transport with its session ID
    transports[transport.id] = transport;

    // Clean up when connection closes
    stream.onAbort(() => {
      delete transports[transport.id];
      transport.close();
    });

    // Connect to MCP server
    await server.connect(transport);
    await transport.start();

    // Keep the connection alive
    while (true) {
      await stream.sleep(30000);
      await stream.writeSSE({ data: 'ping', event: 'heartbeat' });
    }
  });
});

app.post('/messages', async c => {
  const sessionId = c.req.query('sessionId');
  const transport = sessionId ? transports[sessionId] : null;

  if (!transport) {
    return c.text('No active SSE connection for the provided session ID', 400);
  }

  return transport.handlePostMessage(c.req.raw);
});

export default {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  fetch: app.fetch,
  idleTimeout: 120,
};
