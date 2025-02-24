const { DIMO } = require("@dimo-network/data-sdk");
import { z } from "zod";
import { tool } from "ai";

import { extractContentFromTags } from "../utils/parsers";
import { LLMService } from "../llm/llm-service";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

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
    tokenId: z.string().describe("Vehicle token ID to fetch signals for"),
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
  description: "Gets latest signal values for a specific vehicle",
  parameters: z.object({
    tokenId: z
      .string()
      .describe("Vehicle token ID to fetch latest signals for"),
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

// Interfaces
interface Vehicle {
  tokenId: string;
  owner: string;
  definition: {
    make: string;
    model: string;
    year: string;
  };
}

interface Signal {
  tokenId: string;
  availableSignals: string[];
}

interface LatestSignals {
  tokenId: string;
  latestSignals: Signal;
}

export class DimoTool extends APITool<any> {
  private dimo: typeof DIMO;

  schema = [
    { name: "list_vehicles", tool: tool(ListVehiclesToolSchema) },
    { name: "get_vehicle_signals", tool: tool(GetVehicleSignalsToolSchema) },
    { name: "get_latest_signals", tool: tool(GetLatestSignalsToolSchema) },
  ];

  constructor() {
    super({
      name: "DIMO",
      description:
        "Tool for interacting with personal vehicles data and signals, supports wide range of makes and models",
      output:
        "Vehicle list and signals such as tire pressure, location, vehicle speed, angular velocity, wheel speed, altitude, battery voltage, fuel system, engine load, fuel pressure, engine temperature, fuel trim, powertrain range, traction battery, transmission, service distance",
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

  async execute(input: string, llmService: LLMService): Promise<string> {
    const vehiclesIcanAccess = await this.getListOfConnectedVehicles();
    this.printAccessibleVehicles(vehiclesIcanAccess);
    const formattedVehicles = this.formatAccessibleVehicles(vehiclesIcanAccess);

    const { tokenIds, intermediateResponse } = await this.parseInput(
      input + "\n" + formattedVehicles,
      llmService
    );

    if (tokenIds.length > 0) {
      const vehiclesSignals = await this.getVehiclesSignals(tokenIds);
      const cleanedData = await this.cleanData(
        vehiclesSignals,
        input,
        llmService
      );
      logger.info("cleanedData: ", cleanedData);
      return cleanedData;
    } else {
      return intermediateResponse;
    }
  }

  async parseInput(
    input: string,
    llmService: LLMService
  ): Promise<{ tokenIds: string[]; intermediateResponse: string }> {
    const prompt = `
    You are a helpful assistant that parses user queries for DIMO tool.
    Your task is to identify the vehicle and action from the user's query.
    The user can specify a single vehicle by token ID or a list of vehicles by token IDs.
    If the user doesn't specify a vehicle, respond with an empty list of token IDs.
    If it's possible to answer the user's query based on the provided input, respond with an empty list of token IDs.

    <example>
    <user_query>
    how many vehicles do i have
    </user_query>
    <vehicles>
    98765 - Toyota Camry 2022
    45678 - Ford Mustang 2021
    23456 - Honda Civic 2023
    12345 - Chevrolet Bolt 2022
    34567 - Volkswagen ID.4 2023
    56789 - Kia Telluride 2021
    </vehicles>
    <response>
    {
      "tokenIds": [],
      "intermediateResponse": "You have 6 vehicles in total: a Toyota Camry 2022, a Ford Mustang 2021, a Honda Civic 2023, a Chevrolet Bolt 2022, a Volkswagen ID.4 2023, and a Kia Telluride 2021.",
      "processingRequired": false
    }
    </response>
    <user_query>
    get me the speed of Toyota Camry
    </user_query>
    <vehicles>
    98765 - Toyota Camry 2022
    </vehicles>
    <response>
    {
      "tokenIds": ["98765"],
      "intermediateResponse": "Need to fetch the latest signals for vehicle 98765",
      "processingRequired": true
    }
    </response>
    </example>

    respond in the following format:
    <response>
    {
      "tokenIds": string[],
      "intermediateResponse": string,
      "processingRequired": boolean
    }
    </response>
    user query: ${input}

    Put your response in the response tag.
    `;

    const response = await llmService.fastllm.generate(prompt);
    const extractedResponse = extractContentFromTags(response, "response");

    if (!extractedResponse) {
      return { tokenIds: [], intermediateResponse: response };
    }

    return JSON.parse(extractedResponse);
  }

  private async cleanData(
    data: LatestSignals[],
    input: string,
    llmService: LLMService
  ): Promise<string> {
    const prompt = `
    You are a helpful assistant that cleans data based on the user's query.
    The user's query is: ${input}
    The data is: ${JSON.stringify(data)}
    Return only data that is necessary to answer the user's query.
    `;

    return llmService.fastllm.generate(prompt);
  }

  private formatAccessibleVehicles(vehicles: Vehicle[]): string {
    return vehicles
      .map(
        (vehicle) =>
          `${vehicle.tokenId} - ${vehicle.definition.make} ${vehicle.definition.model} ${vehicle.definition.year}`
      )
      .join("\n");
  }

  private printAccessibleVehicles(vehicles: Vehicle[]) {
    console.table(
      vehicles.map((vehicle) => ({
        tokenId: vehicle.tokenId,
        owner: vehicle.owner,
        make: vehicle.definition?.make || "N/A",
        model: vehicle.definition?.model || "N/A",
        year: vehicle.definition?.year || "N/A",
      }))
    );
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

  private async getVehiclesSignals(
    vehicles: string[]
  ): Promise<LatestSignals[]> {
    const jwt = await this.getDevJwt();
    const vehicleData: LatestSignals[] = [];

    await Promise.all(
      vehicles.map(async (id) => {
        try {
          const vehicleJwt = await this.getVehicleJwt(id, jwt);
          const { availableSignals } = await this.getVehicleAvailableSignals(
            id,
            vehicleJwt
          );
          const latestSignals = await this.getVehicleLatestSignals(
            id,
            vehicleJwt,
            availableSignals
          );
          vehicleData.push({
            tokenId: id,
            latestSignals,
          });
        } catch (_) {}
      })
    );
    return vehicleData;
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

  async getRawData(): Promise<LatestSignals[]> {
    const vehiclesIcanAccess = await this.getListOfConnectedVehicles();
    return this.getVehiclesSignals(
      vehiclesIcanAccess.map((vehicle) => vehicle.tokenId)
    );
  }
}

export default DimoTool;
