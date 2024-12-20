import { viemPublicClient } from './viemClient';
import { ethers } from 'ethers';
import projectMultiplexAbi from '../abi/ProjectMultiplex.json';
import { JSON_RPC_URL, FARCASTER_BOT_MNEMONIC } from './config';
import { mnemonicToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';

// parse user message to get the token ticker, token address, and escrow amount
export function parseUserMessage(userMessage: string) {
  // Split on "!create" and take everything after it, then trim whitespace
  const createParams = userMessage.split('!create')[1]?.trim();

  if (!createParams) {
    throw new Error(
      'Invalid message format. Expected: !create <chainId> <token ticker> <token address>',
    );
  }

  // Take only the first three space-separated parameters
  const [chainId, tokenTicker, tokenAddress, ...rest] = createParams.split(' ').filter(Boolean);

  if (!chainId || !tokenTicker || !tokenAddress) {
    throw new Error(
      'Missing required parameters. Expected: !create <chainId> <token ticker> <token address>',
    );
  }

  return { chainId, tokenTicker, tokenAddress };
}

export default async function createSubProject(hookData: any) {
  console.log('creating sub project');

  const { chainId, tokenTicker, tokenAddress } = parseUserMessage(hookData.text);
  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);

  // Use the same mnemonic that Neynar uses
  if (!FARCASTER_BOT_MNEMONIC) {
    throw new Error('FARCASTER_BOT_MNEMONIC is not defined in environment variables');
  }

  // Convert mnemonic to account and get private key
  const botAccount = mnemonicToAccount(FARCASTER_BOT_MNEMONIC);
  const privateKey = botAccount.getHdKey().privateKey;

  console.log('botAccount', botAccount);

  if (!privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }

  const signer = new ethers.Wallet(bytesToHex(privateKey), provider);

  const contract = new ethers.Contract(
    projectMultiplexAbi.address,
    projectMultiplexAbi.abi,
    signer,
  );

  // TODO: check that custody_address is appropriate address to use
  const caster = hookData.author.custody_address;
  const castHash = hookData.hash;

  try {
    const tx = await contract.createProject(chainId, tokenTicker, tokenAddress, caster, castHash);
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    return receipt;
  } catch (error) {
    console.error('Error creating sub project:', error);
  }
}
