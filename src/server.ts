import neynarClient from "./neynarClient";
import { respondToMessage } from "./bot";

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('Server is running', { status: 200 });
    }

    // Handle incoming cast mentions from neynar webhook
    try {
      const hookData = await req.json();
      console.log("Received request", hookData);

      if (!process.env.SIGNER_UUID) {
        throw new Error("Make sure you set SIGNER_UUID in your .env file");
      }

      // respond to the cast asynchronously and return immediately to avoid duplicate processing
      Promise.resolve().then(() => respondToMessage(hookData));

      return new Response(`Replying to the cast`, { status: 200 });
    } catch (e: any) {
      console.error(e);
      return new Response(e.message, { status: 500 });
    }
  },
});

console.log(`Listening on localhost:${server.port}`);
