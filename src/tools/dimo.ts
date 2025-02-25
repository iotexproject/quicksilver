const { DIMO } = require("@dimo-network/data-sdk");
import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";
import { Vehicle, Signal, LatestSignals, DimoParams } from "./types/dimo";

const ListVehiclesToolSchema = {
  name: "list_vehicles",
  description: "Lists all vehicles accessible to the user",
  parameters: z.object({}),
  execute: async () => {
    const tool = new DimoTool();
    return await tool.getListOfConnectedVehicles();
  },
};

const GetVehicleSignalsToolSchema = {
  name: "get_vehicle_signals",
  description: "Gets available signals for a specific vehicle",
  parameters: z.object({
    tokenId: z.string().describe("Vehicle token ID to fetch signals for. Example: 1234567890"),
  }),
  execute: async (input: { tokenId: string }) => {
    const tool = new DimoTool();
    const jwt = await tool.getDevJwt();
    const vehicleJwt = await tool.getVehicleJwt(input.tokenId, jwt);
    return await tool.getVehicleAvailableSignals(input.tokenId, vehicleJwt);
  },
};

const GetLatestSignalsToolSchema = {
  name: "get_latest_signals",
  description:
    "Gets latest signal values for a specific vehicle: " +
    "tire pressure, location, vehicle speed, angular velocity, wheel speed, altitude, " +
    "battery voltage, fuel system, engine load, fuel pressure, engine temperature, fuel trim, " +
    "powertrain range, traction battery, transmission, service distance. " +
    "NOTE: This tool should be called after get_vehicle_signals to ensure the " +
    "vehicle has available signals to show. Not all vehicles support all signals.",
  parameters: z.object({
    tokenId: z
      .string()
      .describe("Vehicle token ID to fetch latest signals for. Example: 1234567890"),
    signals: z.array(z.string()).describe("List of signals to fetch"),
  }),
  execute: async (input: { tokenId: string; signals: string[] }) => {
    const tool = new DimoTool();
    const jwt = await tool.getDevJwt();
    const vehicleJwt = await tool.getVehicleJwt(input.tokenId, jwt);
    return await tool.getVehicleLatestSignals(
      input.tokenId,
      vehicleJwt,
      input.signals
    );
  },
};

export class DimoTool extends APITool<DimoParams> {
  private dimo: typeof DIMO;

  schema = [
    { name: ListVehiclesToolSchema.name, tool: tool(ListVehiclesToolSchema) },
    {
      name: GetVehicleSignalsToolSchema.name,
      tool: tool(GetVehicleSignalsToolSchema),
    },
    {
      name: GetLatestSignalsToolSchema.name,
      tool: tool(GetLatestSignalsToolSchema),
    },
  ];

  constructor() {
    super({
      name: "DIMO",
      description:
        "Tool for interacting with personal vehicles data and signals, supports wide range of makes and models",
      baseUrl: "https://api.dimo.zone",
      twitterAccount: "@DIMO_Network",
    });

    this.initializeDimo();
  }

  private initializeDimo() {
    const client_id = process.env.CLIENT_ID;
    const domain = process.env.REDIRECT_URI;
    const private_key = process.env.API_KEY;
    const privileged_address = process.env.PRIVILEGED_ADDRESS;

    if (!client_id || !domain || !private_key || !privileged_address) {
      throw new Error(
        "Missing one of the following environment variables for DIMO tool: CLIENT_ID, REDIRECT_URI, API_KEY, PRIVILEGED_ADDRESS"
      );
    }

    this.dimo = new DIMO("Production");
  }

  // Public methods that can be called by subtools
  async getListOfConnectedVehicles(): Promise<Vehicle[]> {
    const privelegedAddress = process.env.PRIVILEGED_ADDRESS;
    const response = (await this.dimo.identity.query({
      query: `{
        vehicles(filterBy: { privileged: "${privelegedAddress}" }, first: 100) {
          nodes {
            owner
            tokenId
            definition {
              make
              model
              year
            }
          }
          pageInfo {
            startCursor
            hasPreviousPage
            hasNextPage
          }
        }
      }`,
    })) as any;
    return response.data.vehicles.nodes as Vehicle[];
  }

  async getVehicleAvailableSignals(
    tokenId: string,
    vehicleJwt: any
  ): Promise<Signal> {
    const query = `{ availableSignals(tokenId: ${tokenId}) }`;
    const response = (await this.dimo.telemetry.query({
      ...vehicleJwt,
      query,
    })) as any;
    return response.data;
  }

  async getVehicleLatestSignals(
    tokenId: string,
    vehicleJwt: any,
    signals: string[]
  ): Promise<Signal> {
    const query = this.buildLatestSignalsQuery(tokenId, signals);
    const response = (await this.dimo.telemetry.query({
      ...vehicleJwt,
      query,
    })) as any;
    return response.data;
  }

  async getVehicleJwt(tokenId: string, devJwt: any): Promise<any> {
    return this.dimo.tokenexchange.exchange({
      ...devJwt,
      privileges: [1, 3, 4, 5],
      tokenId: Number(tokenId),
    });
  }

  async getDevJwt(): Promise<any> {
    const client_id = process.env.CLIENT_ID;
    const domain = process.env.REDIRECT_URI;
    const private_key = process.env.API_KEY;

    return this.dimo.auth.getToken({
      client_id,
      domain,
      private_key,
    });
  }

  private buildLatestSignalsQuery(tokenId: string, signals: string[]) {
    return `{ signalsLatest(tokenId: ${tokenId}) {
        ${signals
          .map(
            (signal) => `${signal} {
          value
          timestamp
        }`
          )
          .join("\n")}
      } }`;
  }

  async getRawData(
    params: DimoParams
  ): Promise<Vehicle[] | Signal | LatestSignals[]> {
    if (!params.tokenId) {
      return this.getListOfConnectedVehicles();
    }

    const jwt = await this.getDevJwt();
    const vehicleJwt = await this.getVehicleJwt(params.tokenId, jwt);

    if (!params.signals) {
      return this.getVehicleAvailableSignals(params.tokenId, vehicleJwt);
    }

    return [
      {
        tokenId: params.tokenId,
        latestSignals: await this.getVehicleLatestSignals(
          params.tokenId,
          vehicleJwt,
          params.signals
        ),
      },
    ];
  }
}

export default DimoTool;
