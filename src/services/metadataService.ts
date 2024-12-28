import { ChainId, CHAIN_CONFIG } from "../config";

export interface TokenMetadataGeckoTerminal {
    description: string;
    imageUrl: string; // image_url
    websites: string[];
    discord: string;
    telegram: string;
    twitter: string;
}

interface GeckoTerminalResponse {
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

// TODO: add caching and polling to this service
export async function getTokenMetadataGeckoTerminal(address: string, chainId: ChainId): Promise<TokenMetadataGeckoTerminal | null> {
    const chainName = CHAIN_CONFIG[chainId].name;
    const network = chainName === "ethereum" ? "eth" : chainName;
    const host = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}/info`;
    
    const response = await fetch(host);
    const responseData = await response.json() as GeckoTerminalResponse;

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
    }
}
