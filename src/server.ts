import neynarClient from "./neynarClient";
import { respondToMessage } from "./bot";

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    try {
      const body = await req.text();
      const hookData = JSON.parse(body);

      if (!process.env.SIGNER_UUID) {
        throw new Error("Make sure you set SIGNER_UUID in your .env file");
      }

      // TODO: retrieve cast information and pass it to respondToMessage
      // TODO: retrieve cast hash to return in the response
      // respond to the cast
      const reply = await respondToMessage(hookData);

      return new Response(`Replied to the cast with hash: ${reply.hash}`);
    } catch (e: any) {
      return new Response(e.message, { status: 500 });
    }
  },
});

console.log(`Listening on localhost:${server.port}`);
