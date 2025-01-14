import { config } from 'dotenv';
config();

// bun run bin/deleteImage.ts <image-key>

async function deleteImageViaAPI(imageKey: string) {
  if (!imageKey) {
    console.error('Please provide an image key as a command line argument');
    process.exit(1);
  }

  const API_URL = process.env.API_URL || 'http://localhost:3000';
  const API_KEY = process.env.FARCASTER_BOT_API_KEY;

  try {
    const response = await fetch(`${API_URL}/api/images/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ key: imageKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${data.error || response.statusText}`);
    }

    console.log('Image deleted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

// Get the image key from command line arguments
const imageKey = process.argv[2];

// Run the deletion
deleteImageViaAPI(imageKey)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
