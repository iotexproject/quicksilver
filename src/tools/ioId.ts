import { Tool } from "../types";
import { ethers } from "ethers";

export class IoIDTool implements Tool {
  name: string = "IoIDTool";
  description: string = `
    This tool can read the IoTeX blockchain to get information related to the 
    ioID decentralized identity framework. 
    It supports the following JSON inputs: 
    { "query": "getProjectID", "project_name": "some name" } returns the Project ID for the project name
    { "query": "getProjectInfo", "ioID": "some ioID" } returns project name, status, and other information for the given ioID  
    `;

  provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      "https://babel-api.mainnet.iotex.io",
    );
  }

  async execute(userInput: any): Promise<string> {
    try {
      // Parse user input to a JSON object
      userInput = JSON.parse(userInput);
    } catch (error) {
      return "Invalid input. Please provide a JSON object with the correct query parameters.";
    }

    if (userInput.query === "getProjectID") {
      return await this.getProjectID(userInput.project_name);
    } else if (userInput.query === "getProjectInfo") {
      return await this.getProjectInfo(userInput.ioID);
    } else {
      return "Invalid query. Please provide a valid query parameter.";
    }
  }

  /**
   * Get Project ID by Name
   * @param {string} projectName - The name of the project
   * @returns {Promise<string>} - The project ID
   */
  async getProjectID(projectName: string): Promise<string> {
    const contractAddress = "0xA596800891e6a95Bf737404411ef529c1F377b4e";
    const contractABI = [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_projectId",
            type: "uint256",
          },
        ],
        name: "name",
        outputs: [
          {
            internalType: "string",
            name: "",
            type: "string",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "count",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];

    // Create a contract instance
    const projectContract = new ethers.Contract(
      contractAddress,
      contractABI,
      this.provider,
    );

    try {
      // Compute the hash of the project name
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(projectName));

      // Get the total number of projects
      const totalProjects = await projectContract.count();

      // Iterate through project IDs to find a match
      for (let projectId = 1; projectId <= totalProjects; projectId++) {
        const storedName = await projectContract.name(projectId);
        if (ethers.keccak256(ethers.toUtf8Bytes(storedName)) === nameHash) {
          return projectId.toString();
        }
      }

      return "Project not found.";
    } catch (error) {
      return "Error retrieving project ID: " + error;
    }
  }

  /**
   * Get Project Info by ioID
   * @param {string} ioID - The ioID of the project
   * @returns {Promise<string>} - The project information
   */
  async getProjectInfo(ioID: string): Promise<string> {
    // Not implemented yet
    return "Not implemented yet";
  }
}
