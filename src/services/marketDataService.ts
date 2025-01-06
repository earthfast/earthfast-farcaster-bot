import axios from "axios";
import { BITQUERY_API_KEY, CHAIN_CONFIG, ChainId } from "../config";

export interface TokenMarketMetadata {
    price: number;
    holders: string;
    totalTradeVolume: string;
    totalTrades: string;
    totalBuyVolume: string;
    totalSellVolume: string;
    totalBuys: string;
    totalSells: string;
}

interface CacheEntry {
    data: TokenMarketMetadata;
    timestamp: number;
}

// Cache object to store market data
const marketDataCache: Record<string, CacheEntry> = {};

// Cache duration in milliseconds (6 hours)
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export async function getMarketData(address: string, chainId: ChainId): Promise<TokenMarketMetadata> {
    const cacheKey = `${address}-${chainId}`;
    const now = Date.now();

    // Check cache first
    const cachedData = marketDataCache[cacheKey];
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        console.log("Returning cached market data for", cacheKey);
        return cachedData.data;
    }

    // If no cache hit or cache expired, fetch new data
    const data = await fetchMarketData(address, chainId);

    // Update cache
    marketDataCache[cacheKey] = {
        data,
        timestamp: now
    };

    return data;
}

// Separate function for the actual API call
// return empty marketData in the event of a failure to prevent overloading query credits on failed calls
async function fetchMarketData(address: string, chainId: ChainId): Promise<TokenMarketMetadata> {
    // query variables
    const today = new Date().toISOString().split('T')[0];
    const chainName = chainId === 1 ? "eth" : CHAIN_CONFIG[chainId].name;

    console.log("Fetching fresh market data");

    const queryData = JSON.stringify({
      query: `
        {
          EVM(dataset: archive, network: ${chainName}) {
            TokenHolders(
              date: "${today}"
              tokenSmartContract: "${address}"
              where: {Balance: {Amount: {gt: "0"}}}
            ) {
              uniq(of: Holder_Address)
            }
            DEXTradeByTokens(
              limit: {count: 1}
              where: {
                Trade: {Side: {Currency: {SmartContract: {is: "${address}"}}}}
              }
            ) {
              price: median(of: Trade_Price)
              total_trades: count
              total_buy_volume: sum(
                of: Trade_Side_AmountInUSD
                if: {Trade: {Side: {Type: {is: buy}}}}
              )
              total_sell_volume: sum(
                of: Trade_Side_AmountInUSD
                if: {Trade: {Side: {Type: {is: sell}}}}
              )            
              totalbuys: count(if: {Trade: {Side: {Type: {is: sell}}}})
              totalsells: count(if: {Trade: {Side: {Type: {is: buy}}}})
              total_traded_volume: sum(of: Trade_Side_AmountInUSD)
            }
          }
        }`
    });
  
    const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://streaming.bitquery.io/graphql",
        headers: {
            "Content-Type": "application/json",
            Authorization: BITQUERY_API_KEY,
        },
        data: queryData,
    }
  
    // Initialize with default values
    const marketData: TokenMarketMetadata = {
        price: 0,
        holders: "0",
        totalTradeVolume: "0",
        totalTrades: "0",
        totalBuyVolume: "0",
        totalSellVolume: "0",
        totalBuys: "0",
        totalSells: "0",
    };

    try {
        const response = await axios.request(config);
        const evmData = response.data?.data?.EVM;

        if (!evmData) {
            throw new Error("No EVM data returned from Bitquery");
        }

        // Safely extract holders data
        try {
            if (evmData.TokenHolders?.[0]?.uniq) {
                marketData.holders = evmData.TokenHolders[0].uniq;
            }
        } catch (error) {
            // console.error("Error extracting holders data:", error);
        }

        // Safely extract DEX trade data
        try {
            const dexData = evmData.DEXTradeByTokens?.[0];
            if (dexData) {
                marketData.price = dexData.price ?? marketData.price;
                marketData.totalTradeVolume = dexData.total_traded_volume ?? marketData.totalTradeVolume;
                marketData.totalTrades = dexData.total_trades ?? marketData.totalTrades;
                marketData.totalBuyVolume = dexData.total_buy_volume ?? marketData.totalBuyVolume;
                marketData.totalSellVolume = dexData.total_sell_volume ?? marketData.totalSellVolume;
                marketData.totalBuys = dexData.totalbuys ?? marketData.totalBuys;
                marketData.totalSells = dexData.totalsells ?? marketData.totalSells;
            }
        } catch (error) {
            // console.error("Error extracting DEX trade data:", error);
        }

        return marketData;

    } catch (error) {
        // console.error("Error fetching market data from Bitquery:", error);
        // throw error;
        return marketData;
    }
}


// BITQUERY - can get token holders + dex information
// https://docs.bitquery.io/docs/examples/token-holders/token-holder-api/
  // https://docs.bitquery.io/docs/evm/token-holders/
  // https://docs.bitquery.io/docs/cubes/dextradesbyTokens/
  // https://docs.bitquery.io/docs/usecases/Top-10-ethereum-tokens/
