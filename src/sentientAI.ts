import { QueryOrchestrator } from "./workflow";
import { NewsAPITool } from "./tools/newsapi";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "./tools/nubila";
import { LLMService } from "./llm/llm-service";
import { DePINScanMetricsTool, DePINScanProjectsTool } from "./tools/depinscan";
import { L1DataTool } from "./tools/l1data";
import DimoTool from "./tools/dimo";
import { NuclearOutagesTool } from "./tools/gov";

export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    if (!process.env.FAST_LLM_MODEL || !process.env.LLM_MODEL) {
      throw new Error("FAST_LLM_MODEL and LLM_MODEL must be set");
    }
    this.orchestrator = new QueryOrchestrator({
      tools: [
        new NewsAPITool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
        new DePINScanMetricsTool(),
        new DePINScanProjectsTool(),
        new L1DataTool(),
        // new DimoTool(),
        // new NuclearOutagesTool(),
      ],
      llmService: new LLMService({
        fastLLMModel: process.env.FAST_LLM_MODEL,
        LLMModel: process.env.LLM_MODEL,
      }),
    });
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
