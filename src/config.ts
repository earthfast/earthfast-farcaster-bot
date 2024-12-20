import dotenv from 'dotenv';

dotenv.config();

export const API_SECRET_KEY = process.env.API_SECRET_KEY!;
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

export const PROJECT_BUNDLE_URL =
  'https://token-landing-page-12dec-937.sepolia-staging.earthfast.app/?subProjectId=';
