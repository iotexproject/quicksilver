const { DIMO } = require("@dimo-network/data-sdk");

import { extractContentFromTags } from "../utils/parsers";
import { LLMService } from "../services/llm-service";
import { APITool } from "./tool";

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

  constructor() {
    super({
      name: "DIMO",
      description:
        "Tool for interacting with DIMO network to get vehicle data and signals",

      output:
        "Vehicle list and signanls such as tire pressure, location, vehicle speed, angular velocity, wheel speed, altitude, battery voltage, fuel system, engine load, fuel pressure, engine temperature, fuel trim, powertrain range, traction battery, transmission, service distance",
      baseUrl: "https://api.dimo.zone", // This is a placeholder, actual SDK uses internal endpoints
      twitterAccount: "@DIMO_Network",
    });

    const client_id = process.env.CLIENT_ID;
    const domain = process.env.REDIRECT_URI;
    const private_key = process.env.API_KEY;
    const privileged_address = process.env.PRIVILEGED_ADDRESS;

    if (!client_id || !domain || !private_key || !privileged_address) {
      throw new Error(
        "Missing one of the following environment variables for DIMO tool: CLIENT_ID, REDIRECT_URI, API_KEY, PRIVILEGED_ADDRESS",
      );
    }

    this.dimo = new DIMO("Production");
  }

  async parseInput(
    input: string,
    llmService: LLMService,
  ): Promise<{ tokenIds: string[]; intermediateResponse: string }> {
    const prompt = `
    You are a helpful assistant that parses user queries for DIMO tool.
    Your task is to identify the vehicle and action from the user's query.
    The user can specify a single vehicle by token ID or a list of vehicles by token IDs.
    If the user doesn't specify a vehicle, respond with an empty list of token IDs.
    If it's possible to answer the user's query based on the provided input, respond with an empty list of token IDs.
    respond in the following format:
    <response>
    {
      "tokenIds": string[],
      "intermediateResponse": string,
      "processingRequired": boolean
    }
    </response>
    user query: ${input}
    `;

    const response = await llmService.fastllm.generate(prompt);
    console.log("response: ", response);

    const extractedResponse = extractContentFromTags(response, "response");

    if (!extractedResponse) {
      return { tokenIds: [], intermediateResponse: response };
    }

    return JSON.parse(extractedResponse);
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    const vehiclesIcanAccess = await this.getListOfConnectedVehicles();
    this.printAccessibleVehicles(vehiclesIcanAccess);
    const formattedVehicles = this.formatAccessibleVehicles(vehiclesIcanAccess);

    const { tokenIds, intermediateResponse } = await this.parseInput(
      input + "\n" + formattedVehicles,
      llmService,
    );

    if (tokenIds.length > 0) {
      const vehiclesSignals = await this.getVehiclesSignals(tokenIds);
      return this.cleanData(vehiclesSignals, input, llmService);
    } else {
      return intermediateResponse;
    }
  }

  private formatAccessibleVehicles(vehicles: Vehicle[]): string {
    return vehicles
      .map(
        (vehicle) =>
          `${vehicle.tokenId} - ${vehicle.definition.make} ${vehicle.definition.model} ${vehicle.definition.year}`,
      )
      .join("\n");
  }

  private async cleanData(
    data: LatestSignals[],
    input: string,
    llmService: LLMService,
  ): Promise<string> {
    const prompt = `
    You are a helpful assistant that cleans data based on the user's query.
    The user's query is: ${input}
    The data is: ${JSON.stringify(data)}
    Return only data that is necessary to answer the user's query.
    `;

    return llmService.fastllm.generate(prompt);
  }

  private async getVehiclesSignals(
    vehicles: string[],
  ): Promise<LatestSignals[]> {
    const jwt = await this.getDevJwt();
    const vehicleData: LatestSignals[] = [];

    await Promise.all(
      vehicles.map(async (id) => {
        try {
          const latestSignals = await this.getVehicleSignals(id, jwt);
          vehicleData.push(latestSignals);
        } catch (_) {}
      }),
    );
    return vehicleData;
  }

  private async getVehicleSignals(
    tokenId: string,
    devJwt: any,
  ): Promise<LatestSignals> {
    const vehicleJwt = await this.getVehicleJwt(tokenId, devJwt);
    const { availableSignals } = await this.getVehicleAvailableSignals(
      tokenId,
      vehicleJwt,
    );
    const latestSignals = await this.getVehicleLatestSignals(
      tokenId,
      vehicleJwt,
      availableSignals,
    );
    return {
      tokenId,
      latestSignals,
    };
  }

  private printAccessibleVehicles(vehicles: Vehicle[]) {
    console.table(
      vehicles.map((vehicle) => ({
        tokenId: vehicle.tokenId,
        owner: vehicle.owner,
        make: vehicle.definition?.make || "N/A",
        model: vehicle.definition?.model || "N/A",
        year: vehicle.definition?.year || "N/A",
      })),
    );
  }

  private async getListOfConnectedVehicles(): Promise<Vehicle[]> {
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

  private async getVehicleAvailableSignals(
    tokenId: string,
    vehicleJwt: any,
  ): Promise<Signal> {
    const query = `{ availableSignals(tokenId: ${tokenId}) }`;
    const response = (await this.dimo.telemetry.query({
      ...vehicleJwt,
      query,
    })) as any;
    return response.data;
  }

  private async getVehicleLatestSignals(
    tokenId: string,
    vehicleJwt: any,
    signals: string[],
  ): Promise<Signal> {
    const query = this.buildLatestSignalsQuery(tokenId, signals);
    const response = (await this.dimo.telemetry.query({
      ...vehicleJwt,
      query,
    })) as any;
    return response.data;
  }

  private async getVehicleJwt(tokenId: string, devJwt: any): Promise<any> {
    return this.dimo.tokenexchange.exchange({
      ...devJwt,
      privileges: [1, 3, 4, 5],
      tokenId: Number(tokenId),
    });
  }

  private async getDevJwt(): Promise<any> {
    const client_id = process.env.CLIENT_ID;
    const domain = process.env.REDIRECT_URI;
    const private_key = process.env.API_KEY;

    const developerJwt = await this.dimo.auth.getToken({
      client_id,
      domain,
      private_key,
    });
    return developerJwt;
  }

  private buildLatestSignalsQuery(tokenId: string, signals: string[]) {
    return `{ signalsLatest(tokenId: ${tokenId}) {
        ${signals
          .map(
            (signal) => `${signal} {
          value
          timestamp
        }`,
          )
          .join("\n")}
      } }`;
  }
}

export default DimoTool;
