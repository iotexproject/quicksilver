"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleMemory = void 0;
class SimpleMemory {
    constructor() {
        this.memory = [];
    }
    loadMemoryVariables() {
        return { history: this.memory };
    }
    saveContext(input, output) {
        this.memory.push({ input, output });
    }
    clear() {
        this.memory = [];
    }
}
exports.SimpleMemory = SimpleMemory;
