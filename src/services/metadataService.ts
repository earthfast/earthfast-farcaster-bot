import { ChainId, CHAIN_CONFIG } from "../config";

export interface TokenMetadata {
    description: string;
    imageUrl: string; // image_url
    websites: string[];
    discord: string;
    telegram: string;
    twitter: string;
}

interface TokenMetadataResponse {
    data: {
        attributes: {
            description: string;
            image_url: string;
            websites: string[];
            discord: string;
            telegram: string;
            twitter: string;
        }
    }
}

interface CacheEntry {
    data: TokenMetadata;
    timestamp: number;
}

// Cache object to store metadata
const metadataCache: Record<string, CacheEntry> = {};

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getTokenMetadata(address: string, chainId: ChainId): Promise<TokenMetadata | null> {
    const cacheKey = `${address}-${chainId}`;
    const now = Date.now();

    // Check cache first
    const cachedData = metadataCache[cacheKey];
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        console.log("Returning cached metadata for", cacheKey);
        return cachedData.data;
    }

    // If no cache hit or cache expired, fetch new data
    const data = await fetchTokenMetadata(address, chainId);

    if (data) {
        // Update cache
        metadataCache[cacheKey] = {
            data,
            timestamp: now
        };
    }

    return data;
}

// Separate function for the actual API call
async function fetchTokenMetadata(address: string, chainId: ChainId): Promise<TokenMetadata | null> {
    const chainName = CHAIN_CONFIG[chainId].name;
    const network = chainName === "ethereum" ? "eth" : chainName;
    const host = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}/info`;
    
    try {
        const response = await fetch(host);
        const responseData = await response.json() as TokenMetadataResponse;
        
        if (!responseData?.data?.attributes) {
            console.log("No attributes found in response:", responseData);
            return null;
        }

        const { attributes } = responseData.data;

        return {
            description: attributes.description,
            imageUrl: attributes.image_url,
            websites: attributes.websites,
            discord: attributes.discord,
            telegram: attributes.telegram,
            twitter: attributes.twitter,
        };
    } catch (error) {
        console.error("Error fetching token metadata:", error);
        return null;
    }
}
