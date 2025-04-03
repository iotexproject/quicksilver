import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

export interface MessariMessage {
  role: 'system' | 'user';
  content: string;
}

export interface MessariParams {
  messages: MessariMessage[];
  verbosity?: 'succinct' | 'balanced' | 'verbose';
  response_format?: 'markdown' | 'plaintext';
}

const MessariCopilotToolSchema = {
  name: 'messari_copilot',
  description:
    "Generates contextual crypto responses using Messari's knowledge graph and specialized tools. " +
    "This tool leverages a graph architecture with agents to access Messari's real-time quantitative datasets (including market data, asset metrics, fundraising, token unlocks) " +
    'and qualitative datasets (including news, blogs, YouTube transcriptions, RSS-feeds, Twitter, webcrawl documents, proprietary research, quarterlies, and diligence reports). ' +
    'Use this tool to generate market insights, perform analysis, and process natural language queries about crypto assets, protocols, and projects.\n\n' +
    'Example usage:\n' +
    '{\n' +
    '  "messages": [\n' +
    '    {\n' +
    '      "role": "system",\n' +
    '      "content": "When discussing token models and tokenomics: Explain mechanics in clear, simple terms without jargon, focus on the relationship between tokens and their roles in the ecosystem, break down economic incentives and game theory"\n' +
    '    },\n' +
    '    {\n' +
    '      "role": "user",\n' +
    '      "content": "Tell me about Berachain\'s two token model and how the $BERA token works with $BGT"\n' +
    '    }\n' +
    '  ],\n' +
    '  "verbosity": "verbose",\n' +
    '  "response_format": "markdown"\n' +
    '}',
  parameters: z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['system', 'user']),
          content: z.string().describe('Content of the message to the AI Toolkit'),
        })
      )
      .describe('Array of messages for the AI Toolkit'),
    verbosity: z
      .enum(['succinct', 'balanced', 'verbose'])
      .optional()
      .default('balanced')
      .describe('Controls the length and detail level of the AI-generated response'),
    response_format: z
      .enum(['markdown', 'plaintext'])
      .optional()
      .default('plaintext')
      .describe('Text format for the response'),
  }),
  execute: async (input: MessariParams) => {
    try {
      const tool = new MessariTool();
      return await tool.getCopilotResponse(input);
    } catch (error) {
      logger.error('Error executing messari_copilot tool', error);
      return `Error executing messari_copilot tool`;
    }
  },
};

export class MessariTool extends APITool<MessariParams> {
  schema = [
    {
      name: MessariCopilotToolSchema.name,
      tool: tool(MessariCopilotToolSchema),
    },
  ];

  constructor() {
    super({
      name: 'MessariCopilot',
      description:
        "Tool for generating contextual crypto responses using Messari's knowledge graph and specialized tools.",
      baseUrl: 'https://api.messari.io/ai/v1/chat/completions',
      twitterAccount: '@MessariCrypto',
    });
    const apiKey = process.env.MESSARI_API_KEY;

    if (!apiKey) {
      throw new Error('Missing MESSARI_API_KEY environment variable');
    }
  }

  async getCopilotResponse(params: MessariParams): Promise<any> {
    const apiKey = process.env.MESSARI_API_KEY;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-messari-api-key': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
        verbosity: params.verbosity || 'balanced',
        response_format: params.response_format || 'plaintext',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Messari API error: ${errorText}`);
      throw new Error(`Messari API error: ${errorText}`);
    }

    return response.json();
  }

  async getRawData(params: MessariParams): Promise<any> {
    return this.getCopilotResponse(params);
  }
}

export default MessariTool;
