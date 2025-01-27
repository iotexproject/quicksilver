import { QueryOrchestrator } from "./workflow";
import { NewsAPITool } from "./tools/newsapi";
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from "./tools/nubila";
import { LLMService } from "./services/llm-service";
import { DePINScanMetricsTool, DePINScanProjectsTool } from "./tools/depinscan";
import { L1DataTool } from "./tools/l1data";

export class SentientAI {
  orchestrator: QueryOrchestrator;

  constructor() {
    this.orchestrator = new QueryOrchestrator({
      tools: [
        new NewsAPITool(),
        new CurrentWeatherAPITool(),
        new ForecastWeatherAPITool(),
        new DePINScanMetricsTool(),
        new DePINScanProjectsTool(),
        new L1DataTool(),
      ],
      llmService: new LLMService({
        fastLLMProvider: "openai",
        llmProvider: "anthropic",
      }),
    });
  }

  async execute(input: string): Promise<string> {
    return this.orchestrator.process(input);
  }
}

export default SentientAI;
