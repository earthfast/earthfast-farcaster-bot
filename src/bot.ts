import cron from "node-cron";
import neynarClient from "./neynarClient";
import {
  SIGNER_UUID,
  NEYNAR_API_KEY,
} from "./config";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";

// Validating necessary environment variables or configurations.
if (!SIGNER_UUID) {
    throw new Error("SIGNER_UUID is not defined");
  }
  
  if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not defined");
}

/**
 * Function to generate a message in response to a user's message.
 * @param userMessage - The user's message triggering the bot.
 */
async function generateMessage(userMessage: string): Promise<string> {
    return "gm 🪐";
}

/**
 * Function to publish a message (cast) using neynarClient.
 * @param msg - The message to be published.
 */
const publishCast = async (msg: string) => {
    try {
      // Using the neynarClient to publish the cast.
      await neynarClient.publishCast(SIGNER_UUID, msg);
      console.log("Cast published successfully");
    } catch (err) {
      // Error handling, checking if it's an API response error.
      if (isApiErrorResponse(err)) {
        console.log(err.response.data);
      } else console.log(err);
  }
};

// Responding to the user's first message.
publishCast(generateMessage("gm EarthfastBot"));
