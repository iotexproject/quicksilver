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
const llm_1 = require("./llm");
const api_tool_1 = require("./tools/api_tool");
const agent_1 = require("./agent");
const memory_1 = require("./memory");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const llm = new llm_1.DummyLLM();
        const weatherTool = new api_tool_1.APITool("WeatherAPI", "Get weather information.", "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true&hourly=temperature_2m");
        const tools = [weatherTool];
        const memory = new memory_1.SimpleMemory();
        const agent = new agent_1.Agent(llm, tools, memory);
        const inputs = ["What is the weather?", "what is the temperature?", "what is the wind speed?"];
        for (const input of inputs) {
            const response = yield agent.run(input);
            console.log(`Input: ${input}`);
            console.log("Response:", response);
            console.log("----");
        }
    });
}
main();
