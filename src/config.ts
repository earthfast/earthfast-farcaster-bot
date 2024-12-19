import dotenv from "dotenv";
dotenv.config();

export const FARCASTER_BOT_MNEMONIC = process.env.FARCASTER_BOT_MNEMONIC!;
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
export const SIGNER_UUID = process.env.SIGNER_UUID!;
export const JSON_RPC_URL = process.env.JSON_RPC_URL!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export const PROJECT_BUNDLE_URL = "https://token-landing-page-12dec-937.sepolia-staging.earthfast.app/?subProjectId=";
export const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY!;

// CHAIN IDS
export const ETHEREUM_CHAIN_ID = 1;
export const POLYGON_CHAIN_ID = 137;
export const BSC_CHAIN_ID = 56;
export const ARBITRUM_CHAIN_ID = 42161;
export const OPTIMISM_CHAIN_ID = 10;
export const BASE_CHAIN_ID = 8453;
export const SEPOLIA_CHAIN_ID = 11155111;

// Chain configuration object
export const CHAIN_CONFIG = {
  [ETHEREUM_CHAIN_ID]: {
    name: "ethereum",
  },
  [POLYGON_CHAIN_ID]: {
    name: "polygon",
  },
  [BSC_CHAIN_ID]: {
    name: "bsc",
  },
  [ARBITRUM_CHAIN_ID]: {
    name: "arbitrum",
  },
  [OPTIMISM_CHAIN_ID]: {
    name: "optimism",
  },
  [BASE_CHAIN_ID]: {
    name: "base",
  },
  [SEPOLIA_CHAIN_ID]: {
    name: "sepolia",
  },
} as const;

export type ChainId = keyof typeof CHAIN_CONFIG;
