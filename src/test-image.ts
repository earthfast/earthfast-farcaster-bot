// test-image.ts
import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import { generateAndStoreImage } from './imageService';

// Load environment variables
dotenv.config();

async function test() {
    try {
        console.log("Starting image generation test...");
        console.log("OpenRouter API Key present:", !!process.env.OPENROUTER_API_KEY);
        
        const result = await generateAndStoreImage({
            tokenName: "TESTCOIN",
            description: "A modern cryptocurrency token",
            style: "minimalist, geometric, professional"
        });
        
        console.log("Success! Generated image URL:", result);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();