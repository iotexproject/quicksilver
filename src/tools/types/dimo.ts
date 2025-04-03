export interface Vehicle {
  tokenId: string;
  owner: string;
  definition: {
    make: string;
    model: string;
    year: string;
  };
}

export interface Signal {
  tokenId: string;
  availableSignals: string[];
}

export interface LatestSignals {
  tokenId: string;
  latestSignals: Signal;
}

export interface DimoParams {
  tokenId?: string;
  signals?: string[];
}
