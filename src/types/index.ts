import { Tool } from 'ai';

export interface PromptContext {
  tools: QSTool[];
  toolOutputs: string[];
  input: string;
}

export interface QSTool {
  name: string;
  description: string;
  output: string;
  twitterAccount?: string;
  schema: { name: string; tool: Tool }[];
}

export interface MeteringEvent {
  specversion: string;
  type: string;
  id: string;
  time: string;
  source: string;
  subject: string;
  data: Record<string, unknown>;
}

export interface TrackPromptParams {
  tokens: number;
  model: string;
  type: 'input' | 'output' | 'system';
  id: string;
}

export interface IMetering {
  track(event: MeteringEvent): void;
  trackPrompt(params: TrackPromptParams): void;
  createEvent(params: { type: string; data: Record<string, unknown>; id: string }): MeteringEvent;
}
