import fetch from 'node-fetch';
import OpenAI from 'openai';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  OPENAI_API_KEY,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
} from '../config';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
} as const);

export interface StoredImage {
  url: string;
  key: string;
  lastModified: Date;
  size: number;
  prompt?: string;
}

function sanitizeMetadata(value: string): string {
  // Remove newlines, tabs and convert to single line
  const singleLine = value.replace(/[\n\r\t]/g, ' ').trim();

  // Remove all special characters and emojis, keep only alphanumeric and basic punctuation
  const cleaned = singleLine.replace(/[^a-zA-Z0-9\s.,!?-]/g, '');

  // Ensure the string isn't too long for S3 metadata
  return cleaned.slice(0, 512);
}

export async function generateAndStoreImage(
  prompt: string,
  token: string,
  filename: string,
): Promise<string> {
  try {
    console.log('Generating image with prompt:', prompt);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL received');
    }

    console.log('Image generated:', imageUrl);
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    const timestamp = Date.now();
    const key = `${token}/${filename}.png`;

    // Log the sanitized metadata for debugging
    const sanitizedPrompt = sanitizeMetadata(prompt);
    console.log('Sanitized metadata prompt:', sanitizedPrompt);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(imageBuffer),
        ContentType: 'image/png',
        Metadata: {
          prompt: sanitizedPrompt,
          timestamp: timestamp.toString(),
        },
      }),
    );

    return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error in generateAndStoreImage:', error);
    throw error;
  }
}

export async function listStoredImages(token?: string): Promise<StoredImage[]> {
  try {
    const prefix = token ? `${token}/` : '';
    const command = new ListObjectsV2Command({
      Bucket: AWS_S3_BUCKET_NAME!,
      Prefix: prefix,
    });

    const storedImages: StoredImage[] = [];
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      const response: ListObjectsV2CommandOutput = await s3Client.send(
        new ListObjectsV2Command({
          ...command.input,
          ContinuationToken: continuationToken,
        }),
      );

      const objects = response.Contents || [];
      for (const object of objects) {
        if (object.Key && object.Key.endsWith('.png')) {
          storedImages.push({
            url: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${object.Key}`,
            key: object.Key,
            lastModified: object.LastModified || new Date(),
            size: object.Size || 0,
          });
        }
      }

      isTruncated = response.IsTruncated || false;
      continuationToken = response.NextContinuationToken;
    }

    return storedImages;
  } catch (error) {
    console.error('Error in listStoredImages:', error);
    throw error;
  }
}

export async function deleteImage(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME!,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
}
