import { isApiErrorResponse } from '@neynar/nodejs-sdk';
import OpenAI from "openai";

import neynarClient from "./neynarClient";
import {
  SIGNER_UUID,
  NEYNAR_API_KEY,
  OPENROUTER_API_KEY
} from "./config";
import createSubProject, { parseUserMessage } from "./createSubProject";

// Validating necessary environment variables or configurations.
if (!SIGNER_UUID) {
    throw new Error("SIGNER_UUID is not defined");
  }
  
  if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not defined");
}

if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not defined");
}

// Initialize OpenRouter client
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
        "X-Title": "PagePlex",
    }
});

// TODO: update the hookData type - it's a PostCastResponseCast but the type is not exported
/**
 * Function to generate a message in response to a user's message.
 * @param hookData - The cast triggering the bot.
 */
export async function respondToMessage(hookData: any): Promise<{ hash: string; response: string; }> {
    try {
        console.log("responding to message");

        // Parse the message to get project details
        const { tokenTicker, tokenAddress, escrowAmount } = parseUserMessage(hookData.data.text);

        // Create the sub project
        await createSubProject(hookData.data);

        // Generate a contextual response using OpenRouter
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

        const completion = await openai.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        const responseContent = completion.choices[0]?.message?.content || "Project created successfully!";
        console.log("AI generated response", responseContent);

        // publish the response to farcaster
        const hash = await publishCast(responseContent, hookData.data.hash);

        return { hash, response: responseContent };

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

/**
 * Function to publish a message (cast) using neynarClient.
 * @param msg - The message to be published.
 * @param parentCastHash - The hash of the parent cast.
 */
const publishCast = async (msg: string, parentCastHash: string): Promise<string> => {
    try {
      console.log("publishing cast");
      // Use the neynarClient to publish the cast.
      const postCastResponse = await neynarClient.publishCast({
        signerUuid: SIGNER_UUID,
        text: msg,
        parent: parentCastHash
      });
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
