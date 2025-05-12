import { describe, it, expect } from 'vitest';

import { DummyLLM, ModelAdapter } from '../llm/llm';

describe('LLM', () => {
  describe('DummyLLM', () => {
    it('should return a response', async () => {
      const llm = new DummyLLM();
      const response = await llm.generate('Current temperature in SF?');
      expect(response).toBe(`{"tool":null,"tool_input":"Dummy LLM Response to the user's request."}`);
    });
  });

  describe('ModelAdapter', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        new ModelAdapter({ provider: 'nonexistent' as any, model: 'some-model' });
      }).toThrow('Unsupported provider: nonexistent');
    });
  });
});
