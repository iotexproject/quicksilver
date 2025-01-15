import { get } from "http";
import { Tool } from "./tool";
import { ethers, TransactionResponse } from "ethers";

export class ReadEVMTxTool implements Tool {
  name: string = "ReadEVMTx";
  description: string = `
    This tool can read an EVM blockchain to get transaction information given a transaction hash.
    It supports the following JSON inputs: 
    { "chain": "iotex or ethereum", "testnet": "true or false", "hash": "some tx hash" } returns a JSON object with transaction details
    `;

  constructor() {  }

  async execute(userInput: any): Promise<string> {
    try {
      // Check if userInput is already an object
      if (typeof userInput === "object") {
        userInput = userInput;
      } else {
        userInput = JSON.parse(userInput);
      }
    } catch (error) {
      return "Invalid input. Please provide a JSON object with the correct query parameters.";
    }

    if (userInput.hash) {
      const { chain, testnet, hash } = userInput;
      return await this.getTxInfo(chain, testnet, hash);
    } else {
      return "Invalid query. Please provide a valid hash as the query parameter.";
    }
  }

  /**
   * Get the provider URL based on the chain and testnet parameters
   * @param {string} chain - The blockchain network
   * @param {string} testnet - The testnet flag
   * @returns {string} - The provider URL
   */
  getProviderUrl(chain: string, testnet: string): string {
    // Define a map of mainnet providers for different chains
    const mainnetProviders: Record<string, string> = {
      iotex: "https://babel-api.mainnet.iotex.io",
      ethereum: "https://mainnet.infura.io/v3/your_infura_key",
    }

    // Define a map of testnet providers for different chains
    const testnetProviders: Record<string, string> = {
      iotex: "https://babel-api.testnet.iotex.io",
      ethereum: "https://ropsten.infura.io/v3/your_infura_key",
    }

    // Check if the chain is supported
    if (!mainnetProviders[chain] || !testnetProviders[chain]) {
      return "Chain not supported. Please provide a valid chain parameter.";
    }

    // Return the provider URL based on the testnet flag
    return testnet === "true" ? testnetProviders[chain] : mainnetProviders[chain];
  }

  /**
   * Get Transaction Info by Hash
   * @param {string} hash - The transaction hash
   * @returns {Promise<string>} - The transaction information
   */
  async getTxInfo(chain: string, testnet: string, hash: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(this.getProviderUrl(chain, testnet));     

      // Fetch the transaction using Ethers v6 provider
      const tx: TransactionResponse | null = await provider.getTransaction(hash);

      if (!tx) {
        return `Transaction with hash ${hash} not found.`;
      }

      // Convert the transaction object into a formatted JSON string
      return JSON.stringify(tx, null, 2);
    } catch (error: unknown) {
      // Ensure proper error typing
      if (error instanceof Error) {
        return `Error fetching transaction info: ${error.message}`;
      }
      return "Unknown error occurred while fetching transaction info.";
    }
  }
  
}
