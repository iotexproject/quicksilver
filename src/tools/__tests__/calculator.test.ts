import { describe, expect, it, beforeEach } from 'vitest';

import { CalculatorTool } from '../calculator';

describe('CalculatorTool', () => {
  let tool: CalculatorTool;

  beforeEach(() => {
    tool = new CalculatorTool();
  });

  describe('basic operations', () => {
    it('should add two numbers', async () => {
      const result = await tool.execute({
        operation: 'add',
        operand1: 5,
        operand2: 3,
      });
      expect(result).toBe('8');
    });

    it('should subtract two numbers', async () => {
      const result = await tool.execute({
        operation: 'subtract',
        operand1: 10,
        operand2: 4,
      });
      expect(result).toBe('6');
    });

    it('should multiply two numbers', async () => {
      const result = await tool.execute({
        operation: 'multiply',
        operand1: 6,
        operand2: 7,
      });
      expect(result).toBe('42');
    });

    it('should divide two numbers', async () => {
      const result = await tool.execute({
        operation: 'divide',
        operand1: 15,
        operand2: 3,
      });
      expect(result).toBe('5');
    });
  });

  describe('advanced operations', () => {
    it('should calculate power', async () => {
      const result = await tool.execute({
        operation: 'power',
        operand1: 2,
        operand2: 3,
      });
      expect(result).toBe('8');
    });

    it('should calculate square root', async () => {
      const result = await tool.execute({
        operation: 'sqrt',
        operand1: 16,
      });
      expect(result).toBe('4');
    });

    it('should calculate percentage', async () => {
      const result = await tool.execute({
        operation: 'percentage',
        operand1: 50,
        operand2: 20,
      });
      expect(result).toBe('10');
    });
  });

  describe('error handling', () => {
    it('should handle division by zero', async () => {
      const result = await tool.execute({
        operation: 'divide',
        operand1: 10,
        operand2: 0,
      });
      expect(result).toBe('Error executing calculator tool');
    });

    it('should handle negative square root', async () => {
      const result = await tool.execute({
        operation: 'sqrt',
        operand1: -16,
      });
      expect(result).toBe('Error executing calculator tool');
    });

    it('should handle missing second operand', async () => {
      const result = await tool.execute({
        operation: 'add',
        operand1: 5,
      });
      expect(result).toBe('Error executing calculator tool');
    });
  });

  describe('floating point precision', () => {
    it('should handle floating point calculations', async () => {
      const result = await tool.execute({
        operation: 'divide',
        operand1: 10,
        operand2: 3,
      });
      expect(result).toBe('3.3333333333');
    });

    it('should handle large numbers', async () => {
      const result = await tool.execute({
        operation: 'multiply',
        operand1: 1e10,
        operand2: 1e10,
      });
      expect(result).toBe('100000000000000000000');
    });
  });
});
