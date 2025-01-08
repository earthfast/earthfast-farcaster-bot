import dotenv from 'dotenv';

dotenv.config();

export const FARCASTER_BOT_API_KEY = process.env.FARCASTER_BOT_API_KEY!;
export const FARCASTER_BOT_MNEMONIC = process.env.FARCASTER_BOT_MNEMONIC!;
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
export const SIGNER_UUID = process.env.SIGNER_UUID!;
export const JSON_RPC_URL = process.env.JSON_RPC_URL!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

export const PROJECT_BUNDLE_URL = "https://pageplex.fun/?subProjectId=";
export const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY!;

// CHAIN IDS
export const ETHEREUM_CHAIN_ID = 1;
export const SOLANA_CHAIN_ID = 900; // unofficial chainId for solana used by a few RPC providers
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
  [SOLANA_CHAIN_ID]: {
    name: "solana",
  },
} as const;

export type ChainId = keyof typeof CHAIN_CONFIG;
