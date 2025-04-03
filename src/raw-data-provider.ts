import { APITool } from './tools/tool';
import { QSTool } from './types';

export class RawDataProvider {
  async process(tool: QSTool, params: Record<string, any>): Promise<any> {
    const apiTool = tool as APITool<any>;
    return apiTool.getRawData(params);
  }
}

export default RawDataProvider;
