export interface Memory {
  loadMemoryVariables(): Record<string, any>;
  saveContext(input: string, output: string): void;
  clear(): void;
}
