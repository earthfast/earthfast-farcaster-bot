import neynarClient from "./neynarClient";
import { respondToMessage } from "./bot";
import { ChainId, FARCASTER_BOT_API_KEY, SIGNER_UUID, SOLANA_CHAIN_ID } from "./config";
import { getMarketData } from "./services/marketDataService";
import { generateAndStoreImage, listStoredImages, deleteImage } from './services/imageService';
import { MarketDataPollingService } from './services/marketDataPollingService';
import { getTokenMetadata } from './services/metadataService';

// TODO: move CORS headers to a middleware handler
// CORS headers for /data endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Authentication middleware
const authenticateRequest = (req: Request): boolean => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === FARCASTER_BOT_API_KEY;
};

interface GenerateImageRequest {
  prompt: string;
  tokenKey: string;
  imageType: string;
}

interface DeleteImageRequest {
  key: string;
}

// Create polling service instance
const marketDataPollingService = new MarketDataPollingService();

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

    // handle market data requests from the client
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

        const chainIdParsed = chainId === SOLANA_CHAIN_ID ? SOLANA_CHAIN_ID : parseInt(chainId) as ChainId;
        const marketData = await getMarketData(address, chainIdParsed);
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

    // handle token metadata requests from the client
    if (url.pathname === '/token-metadata') {
      try {
        console.log('Fetching token metadata');
        const tokenAddress = url.searchParams.get('address');
        const chainId = url.searchParams.get('chainId');

        if (!tokenAddress || !chainId) {
          return new Response('Missing tokenAddress or chainId parameter', {
            status: 400,
            headers: corsHeaders
          });
        }

        const chainIdParsed = chainId === SOLANA_CHAIN_ID ? SOLANA_CHAIN_ID : parseInt(chainId) as ChainId;
        const metadata = await getTokenMetadata(tokenAddress, chainIdParsed);
        return new Response(JSON.stringify(metadata), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
        });
      } catch (error) {
        console.error('Error fetching token metadata:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch token metadata' }), { 
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // API documentation endpoint
    if (url.pathname === '/api' || url.pathname === '/api/') {
      const docs = {
        authentication: {
          type: 'Bearer Token',
          header: 'Authorization: Bearer your-api-key',
          note: 'All endpoints except /api and /health require authentication',
        },
        endpoints: {
          '/api/images/generate': {
            method: 'POST',
            description: 'Generate and store a new image',
            body: {
              prompt: 'string - The image generation prompt',
              identifier: 'string - Identifier for the image',
            },
          },
          '/api/images/list': {
            method: 'GET',
            description: 'List stored images',
            query: {
              prefix: 'string (optional) - Filter images by prefix',
            },
          },
          '/api/images/delete': {
            method: 'DELETE',
            description: 'Delete a stored image',
            body: {
              key: 'string - The key of the image to delete',
            },
          },
        },
      };

      return new Response(JSON.stringify(docs, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Protected API endpoints
    if (url.pathname.startsWith('/api/')) {
      // Check authentication for all /api/ routes except documentation and list images
      if (url.pathname !== '/api' || url.pathname !== '/api/images/list' && !authenticateRequest(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        });
      }

      // Image generation endpoint
      if (url.pathname === '/api/images/generate' && req.method === 'POST') {
        try {
          const body = await req.json();
          const { prompt, tokenKey, imageType } = body as GenerateImageRequest;

          if (!prompt || !tokenKey) {
            return new Response(JSON.stringify({ error: 'prompt and tokenKey are required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const imageUrl = await generateAndStoreImage(prompt, tokenKey, imageType);
          return new Response(JSON.stringify({ success: true, imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // List images endpoint
      if (url.pathname === '/api/images/list' && req.method === 'GET') {
        try {
          const tokenKey = url.searchParams.get('tokenKey');
          const images = await listStoredImages(tokenKey || undefined);
          return new Response(JSON.stringify({ success: true, images }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Delete image endpoint
      if (url.pathname === '/api/images/delete' && req.method === 'DELETE') {
        try {
          const body = await req.json();
          const { key } = body as DeleteImageRequest;

          if (!key) {
            return new Response(JSON.stringify({ error: 'key is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const success = await deleteImage(key);
          return new Response(JSON.stringify({ success }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Handle incoming cast mentions from neynar webhook
    async function handleWebhook(req: Request, test: boolean = false) {
      try {
        const hookData = await req.json();
        console.log('Received request', hookData);

        if (!SIGNER_UUID) {
          throw new Error('Make sure you set SIGNER_UUID in your .env file');
        }

        // respond to the cast asynchronously and return immediately to avoid duplicate processing
        Promise.resolve().then(() => respondToMessage(hookData, test));
        return new Response(`Replying to the cast`, { status: 200 });
      } catch (e: any) {
        console.error(e);
        return new Response(e.message, { status: 500 });
      }
    }

    if (url.pathname === '/webhook') {
      return handleWebhook(req, true);
    }

    if (url.pathname === '/webhook-test') {
      return handleWebhook(req, true);
    }

    // Handle unknown endpoints
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on localhost:${server.port}`);

// Start the market data polling service
marketDataPollingService.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  marketDataPollingService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  marketDataPollingService.stop();
  process.exit(0);
});
