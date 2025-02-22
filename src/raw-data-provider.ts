import { Tool } from "./types";
import { APITool } from "./tools/tool";

export class RawDataProvider {
  async process(tool: Tool, params: Record<string, any>): Promise<any> {
    const apiTool = tool as APITool<any>;
    return apiTool.getRawData(params);
  }
}

export default RawDataProvider;
