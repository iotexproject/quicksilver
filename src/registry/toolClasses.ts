import { ToolName } from './toolNames';
import { AirQualityTool } from '../tools/airquality';
import { AskSpecialtyTool } from '../tools/askSpecialty';
import { CalculatorTool } from '../tools/calculator';
import { CMCBaseTool } from '../tools/cmc';
import { DefiLlamaTool } from '../tools/defillama';
import { DePINNinjaTool } from '../tools/depinninja';
import { DePINScanMetricsTool, DePINScanProjectsTool } from '../tools/depinscan';
import DimoTool from '../tools/dimo';
import { NuclearOutagesTool } from '../tools/gov';
import { L1DataTool } from '../tools/l1data';
import LumaEventsTool from '../tools/luma';
import { MapboxTool } from '../tools/mapbox';
import MessariTool from '../tools/messari';
import { NewsAPITool } from '../tools/newsapi';
import { CurrentWeatherAPITool, ForecastWeatherAPITool } from '../tools/nubila';
import { ThirdWebTool } from '../tools/thirdWeb';
import { TimestampConverterTool } from '../tools/time';

export const availableTools = [
  {
    name: ToolName.NEWS,
    toolClass: NewsAPITool,
  },
  {
    name: ToolName.WEATHER_CURRENT,
    toolClass: CurrentWeatherAPITool,
  },
  {
    name: ToolName.WEATHER_FORECAST,
    toolClass: ForecastWeatherAPITool,
  },
  {
    name: ToolName.DEPIN_METRICS,
    toolClass: DePINScanMetricsTool,
  },
  {
    name: ToolName.DEPIN_PROJECTS,
    toolClass: DePINScanProjectsTool,
  },
  {
    name: ToolName.L1DATA,
    toolClass: L1DataTool,
  },
  {
    name: ToolName.DIMO,
    toolClass: DimoTool,
  },
  {
    name: ToolName.NUCLEAR,
    toolClass: NuclearOutagesTool,
  },
  {
    name: ToolName.MAPBOX,
    toolClass: MapboxTool,
  },
  {
    name: ToolName.LUMA,
    toolClass: LumaEventsTool,
  },
  {
    name: ToolName.THIRDWEB,
    toolClass: ThirdWebTool,
  },
  {
    name: ToolName.CMC,
    toolClass: CMCBaseTool,
  },
  {
    name: ToolName.DEFILLAMA,
    toolClass: DefiLlamaTool,
  },
  {
    name: ToolName.ASK_SPECIALTY,
    toolClass: AskSpecialtyTool,
  },
  {
    name: ToolName.TIMESTAMP_CONVERTER,
    toolClass: TimestampConverterTool,
  },
  {
    name: ToolName.CALCULATOR,
    toolClass: CalculatorTool,
  },
  {
    name: ToolName.AIR_QUALITY,
    toolClass: AirQualityTool,
  },
  {
    name: ToolName.DEPIN_NINJA,
    toolClass: DePINNinjaTool,
  },
  {
    name: ToolName.MESSARI,
    toolClass: MessariTool,
  },
];
