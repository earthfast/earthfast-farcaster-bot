import OpenAI from "openai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables');
}
if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION is not defined in environment variables');
}
if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('AWS_ACCESS_KEY_ID is not defined in environment variables');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_SECRET_ACCESS_KEY is not defined in environment variables');
}
if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize S3 client with type-safe configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
} as const);

interface ImageMetadata {
    tokenName: string;
    description?: string;
    style?: string;
}

export async function generateAndStoreImage(metadata: ImageMetadata): Promise<string> {
    try {
        const prompt = `Create a professional and artistic image for a crypto token named ${metadata.tokenName}. 
            ${metadata.description ? metadata.description : ''}
            ${metadata.style ? `Style: ${metadata.style}` : 'Style: modern, minimalist'}`;

        console.log("Generating image with prompt:", prompt);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
            throw new Error("No image URL received");
        }

        console.log("Image generated:", imageUrl);

        // Download the image
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();

        // Generate unique filename
        const filename = `${metadata.tokenName}-${Date.now()}.png`;

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: filename,
            Body: Buffer.from(imageBuffer),
            ContentType: 'image/png'
        }));

        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
    } catch (error) {
        console.error("Error in generateAndStoreImage:", error);
        throw error;
    }
}
