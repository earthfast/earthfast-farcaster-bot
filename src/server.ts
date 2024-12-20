import { generateAndStoreImage, listStoredImages, deleteImage } from './imageService';
import { respondToMessage } from './bot';
import { FARCASTER_BOT_API_KEY, SIGNER_UUID } from './config';

// Authentication middleware
const authenticateRequest = (req: Request): boolean => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === FARCASTER_BOT_API_KEY;
};

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('Server is running', { status: 200 });
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
      // Check authentication for all /api/ routes except documentation
      if (url.pathname !== '/api' && !authenticateRequest(req)) {
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
          const { prompt, identifier, filename } = body;

          if (!prompt || !identifier) {
            return new Response(JSON.stringify({ error: 'prompt and identifier are required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const imageUrl = await generateAndStoreImage(prompt, identifier, filename);
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
          const prefix = url.searchParams.get('prefix');
          const images = await listStoredImages(prefix || undefined);
          return new Response(JSON.stringify({ success: true, images }), {
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

      // Delete image endpoint
      if (url.pathname === '/api/images/delete' && req.method === 'DELETE') {
        try {
          const body = await req.json();
          const { key } = body;

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
    if (url.pathname === '/webhook') {
      try {
        const hookData = await req.json();
        console.log('Received request', hookData);

        if (!SIGNER_UUID) {
          throw new Error('Make sure you set SIGNER_UUID in your .env file');
        }

        // respond to the cast asynchronously and return immediately to avoid duplicate processing
        Promise.resolve().then(() => respondToMessage(hookData));
        return new Response(`Replying to the cast`, { status: 200 });
      } catch (e: any) {
        console.error(e);
        return new Response(e.message, { status: 500 });
      }
    }

    // Handle unknown endpoints
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on localhost:${server.port}`);
