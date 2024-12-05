import { isApiErrorResponse } from "@neynar/nodejs-sdk";
import { ChatGPTAPI } from 'chatgpt';

import neynarClient from "./neynarClient";
import {
  SIGNER_UUID,
  NEYNAR_API_KEY,
  OPENAI_API_KEY
} from "./config";
import createSubProject, { parseUserMessage } from "./createSubProject";

// Validating necessary environment variables or configurations.
if (!SIGNER_UUID) {
    throw new Error("SIGNER_UUID is not defined");
  }
  
  if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not defined");
}

if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined");
}

// Initialize ChatGPT API
const chatGPT = new ChatGPTAPI({
    apiKey: OPENAI_API_KEY
});

/**
 * Function to generate a message in response to a user's message.
 * @param userMessage - The user's message triggering the bot.
 */
export async function respondToMessage(userMessage: string): Promise<{ hash: string; response: string; }> {
    try {
        // Parse the message to get project details
        const { tokenTicker, tokenAddress, escrowAmount } = parseUserMessage(userMessage);

        // Create the sub project
        await createSubProject(userMessage);

        // Generate a contextual response using ChatGPT
        const prompt = `
            Generate a friendly and concise response (max 280 characters) for a user who just created a sub-project with these details:
            - Token: ${tokenTicker}
            - Amount: ${escrowAmount}

            The response should:
            1. Confirm the project creation
            2. Mention the token and amount
            3. Be encouraging and positive
            4. Use no more than 1-2 emojis
        `;

        const response = await chatGPT.sendMessage(prompt);

        // publish the response to farcaster
        const hash = await publishCast(response.text);

        return { hash, response: response.text };

    } catch (error) {
        if (error instanceof Error) {
            // If it's a validation error from parseUserMessage, return a helpful message
            if (error.message.includes("Expected: !create")) {
                return { hash: "", response: "To create a sub-project, please use the format: !create <token ticker> <token address> <escrow amount> 🤖" };
            }
            // For other errors, return a generic error message
            return { hash: "", response: "Sorry, I encountered an error while creating your sub-project. Please try again later 🔧" };
        }
        return { hash: "", response: "An unexpected error occurred 😅" };
    }
}

// TODO: retrieve the parent cast hash from the hook data
/**
 * Function to publish a message (cast) using neynarClient.
 * @param msg - The message to be published.
 */
const publishCast = async (msg: string): Promise<string> => {
    try {
      // Using the neynarClient to publish the cast.
      const postCastResponse = await neynarClient.publishCast({ signerUuid: SIGNER_UUID, text: msg });
      console.log("Cast published successfully");
      return postCastResponse.cast.hash;
    } catch (err) {
      // Error handling, checking if it's an API response error.
      if (isApiErrorResponse(err)) {
        console.log(err.response.data);
      } else console.log(err);
      return "";
  }
};
