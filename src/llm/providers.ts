import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { openrouter } from '@openrouter/ai-sdk-provider';

export enum ModelProviderName {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  OPENROUTER = 'openrouter',
}

export const ModelProviders = {
  [ModelProviderName.ANTHROPIC]: anthropic,
  [ModelProviderName.OPENAI]: openai,
  [ModelProviderName.DEEPSEEK]: deepseek,
  [ModelProviderName.OPENROUTER]: openrouter,
};
