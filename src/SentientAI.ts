import { Agent } from "./agent"; // Go up one level, then into src
import { NewsAPITool } from "./tools/newsapi"; // Go up one level, then into src/tools
import { DePINTool } from "./tools/depin_tool";
import { ReadEVMTxTool } from "./tools/read_evm_tx";

import {
  CurrentWeatherAPITool,
  ForecastWeatherAPITool,
} from "./tools/weatherapi"; // Go up one level, then into src/tools

export class SentientAI {
  weatherAgent = new Agent({
    tools: [new CurrentWeatherAPITool(), new ForecastWeatherAPITool()],
  });

  depinTool = new DePINTool();
  newsTool = new NewsAPITool();
  readEVMTxTool = new ReadEVMTxTool();

  agent = new Agent({
    tools: [
      this.weatherAgent, 
      this.depinTool, 
      this.newsTool, 
      this.readEVMTxTool
    ],
  });
}
