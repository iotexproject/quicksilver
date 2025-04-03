import { z } from 'zod';
import { tool } from 'ai';
import { APITool } from './tool';
import { logger } from '../logger/winston';

const OperationSchema = z
  .enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'percentage'])
  .describe('The arithmetic operation to perform');

const CalculatorToolSchema = {
  name: 'calculator',
  description:
    'A calculator that performs arithmetic operations including basic operations, power, square root, and percentage calculations',
  parameters: z.object({
    operation: OperationSchema,
    operand1: z.number().describe('The first operand'),
    operand2: z.number().optional().describe('The second operand (not required for sqrt operation)'),
  }),
  execute: async (args: { operation: z.infer<typeof OperationSchema>; operand1: number; operand2?: number }) => {
    const tool = new CalculatorTool();
    return tool.execute(args);
  },
};

export class CalculatorTool extends APITool<{
  operation: z.infer<typeof OperationSchema>;
  operand1: number;
  operand2?: number;
}> {
  schema = [{ name: CalculatorToolSchema.name, tool: tool(CalculatorToolSchema) }];

  constructor() {
    super({
      name: CalculatorToolSchema.name,
      description: CalculatorToolSchema.description,
      baseUrl: 'calculator', // This is a local tool, so we use a dummy baseUrl
    });
  }

  async getRawData(params: {
    operation: z.infer<typeof OperationSchema>;
    operand1: number;
    operand2?: number;
  }): Promise<number> {
    const { operation, operand1, operand2 } = params;
    this.validateOperands(operation, operand1, operand2);
    return this.performOperation(operation, operand1, operand2);
  }

  async execute(args: { operation: z.infer<typeof OperationSchema>; operand1: number; operand2?: number }) {
    return this.withErrorHandling('calculator', async () => {
      const result = await this.getRawData(args);
      return this.formatResult(result);
    });
  }

  private validateOperands(operation: z.infer<typeof OperationSchema>, operand1: number, operand2?: number): void {
    if (operation !== 'sqrt' && operand2 === undefined) {
      throw new Error(`Second operand is required for operation: ${operation}`);
    }

    if (operation === 'divide' && operand2 === 0) {
      throw new Error('Cannot divide by zero');
    }

    if (operation === 'sqrt' && operand1 < 0) {
      throw new Error('Cannot calculate square root of a negative number');
    }
  }

  private performOperation(operation: z.infer<typeof OperationSchema>, operand1: number, operand2?: number): number {
    switch (operation) {
      case 'add':
        return operand1 + (operand2 as number);
      case 'subtract':
        return operand1 - (operand2 as number);
      case 'multiply':
        return operand1 * (operand2 as number);
      case 'divide':
        return operand1 / (operand2 as number);
      case 'power':
        return Math.pow(operand1, operand2 as number);
      case 'sqrt':
        return Math.sqrt(operand1);
      case 'percentage':
        return (operand1 * (operand2 as number)) / 100;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private formatResult(result: number): string {
    // Handle floating point precision issues
    const formattedResult = Number(result.toFixed(10));
    return formattedResult.toString();
  }

  private async withErrorHandling<T>(operation: string, action: () => Promise<T>): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }
}
