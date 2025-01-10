import { ethers } from 'ethers';
import projectMultiplexAbi from '../abi/ProjectMultiplex.json';
import { JSON_RPC_URL, FARCASTER_BOT_MNEMONIC } from './config';
import { mnemonicToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';

interface CreateSubProjectParams {
  chainId: string;
  tokenTicker: string;
  tokenAddress: string;
  text: string;
  author: {
    username: string;
  };
  hash: string;
}

export default async function createSubProject(createSubProjectParams: CreateSubProjectParams) {
  console.log('creating sub project');

  const { chainId, tokenTicker, tokenAddress } = createSubProjectParams;
  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);

  // Use the same mnemonic that Neynar uses
  if (!FARCASTER_BOT_MNEMONIC) {
    throw new Error('FARCASTER_BOT_MNEMONIC is not defined in environment variables');
  }

  // Convert mnemonic to account and get private key
  const botAccount = mnemonicToAccount(FARCASTER_BOT_MNEMONIC);
  const privateKey = botAccount.getHdKey().privateKey;

  if (!privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }

  const signer = new ethers.Wallet(bytesToHex(privateKey), provider);

  const contract = new ethers.Contract(
    projectMultiplexAbi.address,
    projectMultiplexAbi.abi,
    signer,
  );

  const caster = createSubProjectParams.author.username;
  const castHash = createSubProjectParams.hash;

  try {
    const tx = await contract.createProject(chainId, tokenTicker, tokenAddress, caster, castHash);
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed');
    return receipt;
  } catch (error) {
    console.error('Error creating sub project:', error);
    throw error; // Re-throw to handle in the calling function
  }
}
