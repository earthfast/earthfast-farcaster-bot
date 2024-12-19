import axios from "axios";
import { BITQUERY_API_KEY, CHAIN_CONFIG, ChainId } from "./config";

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
            Authorization: process.env.BITQUERY_API_KEY,
        },
        data: queryData,
    }
  
    const response = await axios.request(config);
  
    console.log("BITQUERY RESPONSE: ", response);
  
    return {
        price: response.data.data.EVM.DEXTradeByTokens[0].price,
        holders: response.data.data.EVM.TokenHolders[0].uniq,
        totalTradeVolume: response.data.data.EVM.DEXTradeByTokens[0].total_traded_volume,
        totalTrades: response.data.data.EVM.DEXTradeByTokens[0].total_trades,
        totalBuyVolume: response.data.data.EVM.DEXTradeByTokens[0].total_buy_volume,
        totalSellVolume: response.data.data.EVM.DEXTradeByTokens[0].total_sell_volume,
        totalBuys: response.data.data.EVM.DEXTradeByTokens[0].totalbuys,
        totalSells: response.data.data.EVM.DEXTradeByTokens[0].totalsells,
    }
}
  