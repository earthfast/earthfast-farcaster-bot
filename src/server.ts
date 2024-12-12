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

      // TODO: retrieve cast information and pass it to respondToMessage
      // TODO: retrieve cast hash to return in the response
      // respond to the cast
      const reply = await respondToMessage(hookData);

      return new Response(`Replied to the cast with hash: ${reply.hash}`);
    } catch (e: any) {
      console.error(e);
      return new Response(e.message, { status: 500 });
    }
  },
});

console.log(`Listening on localhost:${server.port}`);
