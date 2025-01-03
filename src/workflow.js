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
exports.Workflow = void 0;
class Workflow {
    constructor(llm, tools, memory) {
        this.llm = llm;
        this.tools = tools;
        this.memory = memory;
    }
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const memoryVariables = this.memory.loadMemoryVariables();
            const toolsString = this.tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
            const prompt = `
            Previous Conversation: ${JSON.stringify(memoryVariables.history)}
            User Input: ${input}

            Available Tools:
            ${toolsString}

            Which tool should I use (or say "No Tool Needed")?`;
            const toolChoice = (yield this.llm.generate(prompt)).trim().toLowerCase();
            const chosenTool = this.tools.find(tool => tool.name.toLowerCase() === toolChoice);
            let output;
            if (chosenTool) {
                output = yield chosenTool.execute(input);
            }
            else {
                output = yield this.llm.generate(`User Input: ${input}`);
            }
            this.memory.saveContext(input, output);
            return output;
        });
    }
}
exports.Workflow = Workflow;
