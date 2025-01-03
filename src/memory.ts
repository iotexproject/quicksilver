export interface Memory {
  loadMemoryVariables(): Record<string, any>;
  saveContext(input: string, output: string): void;
  clear(): void;
}

export class SimpleMemory implements Memory {
  private memory: { input: string; output: string }[] = [];

  loadMemoryVariables(): Record<string, any> {
    return { history: this.memory };
  }

  saveContext(input: string, output: string): void {
    this.memory.push({ input, output });
  }

  clear(): void {
    this.memory = [];
  }
}