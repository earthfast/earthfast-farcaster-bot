import { viemPublicClient } from "./viemClient";
import { ethers } from "ethers";
import projectMultiplexAbi from "../abi/localhost/ProjectMultiplex.json";
import { JSON_RPC_URL, FARCASTER_BOT_MNEMONIC } from "./config";
import { mnemonicToAccount } from "viem/accounts";
import { bytesToHex } from "viem";

// parse user message to get the token ticker, token address, and escrow amount
export function parseUserMessage(userMessage: string){
    // Split on "!create" and take everything after it, then trim whitespace
    const createParams = userMessage.split("!create")[1]?.trim();
    
    if (!createParams) {
        throw new Error("Invalid message format. Expected: !create <token ticker> <token address> <escrow amount>");
    }

    // Take only the first three space-separated parameters
    const [tokenTicker, tokenAddress, escrowAmount, ...rest] = createParams.split(" ").filter(Boolean);

    if (!tokenTicker || !tokenAddress || !escrowAmount) {
        throw new Error("Missing required parameters. Expected: !create <token ticker> <token address> <escrow amount>");
    }

    return { tokenTicker, tokenAddress, escrowAmount };
}

export default async function createSubProject(userMessage: string) {
    const { tokenAddress, escrowAmount } = parseUserMessage(userMessage);
    const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
    
    // Use the same mnemonic that Neynar uses
    if (!FARCASTER_BOT_MNEMONIC) {
        throw new Error("FARCASTER_BOT_MNEMONIC is not defined in environment variables");
    }
    
    // Convert mnemonic to account and get private key
    const botAccount = mnemonicToAccount(FARCASTER_BOT_MNEMONIC);
    const privateKey = botAccount.getHdKey().privateKey;
    
    if (!privateKey) {
        throw new Error("Failed to derive private key from mnemonic");
    }

    const signer = new ethers.Wallet(bytesToHex(privateKey), provider);

    const contract = new ethers.Contract(
        projectMultiplexAbi.address,
        projectMultiplexAbi.abi,
        signer
    );

    // TODO: get the caster address from the farcaster api
    const caster = "0xYourCasterAddress"; // Replace with actual caster address
    // TODO: get the cast hash from the farcaster api
    const castHash = ethers.encodeBytes32String("yourCastHash"); // Replace with actual hash

    try {
        const tx = await contract.createProject(tokenAddress, caster, escrowAmount, castHash);
        console.log("Transaction hash:", tx.hash);
        await tx.wait();
        console.log("Transaction confirmed");
    } catch (error) {
        console.error("Error creating sub project:", error);
    }
}
