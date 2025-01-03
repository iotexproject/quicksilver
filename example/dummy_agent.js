"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const llm_1 = require("../src/llm");
const memory_1 = require("../src/memory");
const workflow_1 = require("../src/workflow");
const agent_1 = require("../src/agent");
// Dummy Tool
class EchoTool {
    constructor() {
        this.name = "Echo";
        this.description = "Repeats the input back to you.";
    }
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return `Echo: ${input}`;
        });
    }
}
function runDummyAgent() {
    return __awaiter(this, void 0, void 0, function* () {
        const llm = new llm_1.DummyLLM();
        const echoTool = new EchoTool(); // Explicitly type echoTool
        const tools = [echoTool];
        const memory = new memory_1.SimpleMemory();
        const workflow = new workflow_1.Workflow(llm, tools, memory);
        const agent = new agent_1.Agent(llm, tools, memory);
        const inputs = [
            "Hello, Quicksilver!",
            "Repeat that again.", // Demonstrates memory
            "What is your name?", // Demonstrates no tool needed
        ];
        for (const input of inputs) {
            console.log(`User Input: ${input}`);
            const response = yield agent.run(input);
            console.log(`Agent Response: ${response}`);
            console.log("----");
        }
    });
}
runDummyAgent();
