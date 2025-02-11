import { QueryOrchestrator } from "./workflow";
import { NewsAPITool } from "./tools/newsapi";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "./tools/nubila";
import { LLMService } from "./services/llm-service";
import { DePINScanMetricsTool, DePINScanProjectsTool } from "./tools/depinscan";
import { L1DataTool } from "./tools/l1data";
import DimoTool from "./tools/dimo";
export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    if (!process.env.FAST_LLM_PROVIDER || !process.env.LLM_PROVIDER) {
      throw new Error("FAST_LLM_PROVIDER and LLM_PROVIDER must be set");
    }
    this.orchestrator = new QueryOrchestrator({
      tools: [
        new NewsAPITool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
        new DePINScanMetricsTool(),
        new DePINScanProjectsTool(),
        new L1DataTool(),
        new DimoTool(),
      ],
      llmService: new LLMService({
        fastLLMProvider: process.env.FAST_LLM_PROVIDER,
        llmProvider: process.env.LLM_PROVIDER,
      }),
    });
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
