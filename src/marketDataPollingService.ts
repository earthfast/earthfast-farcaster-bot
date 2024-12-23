import { ethers } from 'ethers';
import projectMultiplexAbi from '../abi/ProjectMultiplex.json';
import { getMarketData } from './marketDataService';
import { JSON_RPC_URL } from './config';

interface SubProject {
  chainId: number;
  tokenName: string;
  token: string;
  caster: string;
  castHash: string;
}

export class MarketDataPollingService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  constructor() {
    this.provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
    this.contract = new ethers.Contract(
      projectMultiplexAbi.address,
      projectMultiplexAbi.abi,
      this.provider
    );
  }

  async pollMarketData() {
    try {
      console.log('Polling market data for all subprojects...');
      
      // Get all subproject IDs
      const subProjectIds = await this.contract.getSubProjectIds();
      
      // Fetch details for each subproject
      for (const subProjectId of subProjectIds) {
        try {
          const subProject: SubProject = await this.contract.subProjects(subProjectId);
          
          console.log(`Fetching market data for token ${subProject.token} on chain ${subProject.chainId}`);
          
          // Get market data for the token
          const marketData = await getMarketData(subProject.token, subProject.chainId);
          
          console.log(`Market data for ${subProject.tokenName}:`, marketData);
        } catch (error) {
          console.error(`Error fetching market data for subproject ${subProjectId}:`, error);
          // Continue with next subproject even if one fails
          continue;
        }
      }
    } catch (error) {
      console.error('Error in market data polling:', error);
    }
  }

  start() {
    if (this.pollingInterval) {
      console.warn('Market data polling service is already running');
      return;
    }

    // Poll immediately on start
    this.pollMarketData();

    // Set up periodic polling
    this.pollingInterval = setInterval(() => {
      this.pollMarketData();
    }, this.POLLING_INTERVAL);

    console.log('Market data polling service started');
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Market data polling service stopped');
    }
  }
} 