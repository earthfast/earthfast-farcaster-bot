import neynarClient from "./neynarClient";
import { respondToMessage } from "./bot";
import { getMarketData } from "./marketDataService";
import { ChainId } from "./config";

// CORS headers for /market-data endpoint
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('Server is running', { status: 200 });
    }

    if (url.pathname === '/market-data') {
      try {
        const address = url.searchParams.get('address');
        const chainId = url.searchParams.get('chainId');

        if (!address || !chainId) {
          return new Response('Missing address or chainId parameter', {
            status: 400,
            headers: corsHeaders
          });
        }

        const marketData = await getMarketData(address, parseInt(chainId) as ChainId);
        return new Response(JSON.stringify(marketData), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Error fetching market data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch market data' }), { 
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Handle incoming cast mentions from neynar webhook on /
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
