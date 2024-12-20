import OpenAI from "openai";
import { S3Client, PutObjectCommand, ListObjectsV2Command, ListObjectsV2CommandOutput, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { OPENAI_API_KEY, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME } from './config';
import fetch from 'node-fetch';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
} as const);

export interface StoredImage {
    url: string;
    key: string;
    lastModified: Date;
    size: number;
    prompt?: string;
}

export async function generateAndStoreImage(prompt: string, identifier: string): Promise<string> {
    try {
        console.log("Generating image with prompt:", prompt);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
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
        const timestamp = Date.now();
        const filename = `${identifier}-${timestamp}.png`;

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: AWS_S3_BUCKET_NAME!,
            Key: filename,
            Body: Buffer.from(imageBuffer),
            ContentType: 'image/png',
            Metadata: {
                prompt: prompt,
                timestamp: timestamp.toString()
            }
        }));

        return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${filename}`;
    } catch (error) {
        console.error("Error in generateAndStoreImage:", error);
        throw error;
    }
}

export async function listStoredImages(prefix?: string): Promise<StoredImage[]> {
    try {
        const command = new ListObjectsV2Command({
            Bucket: AWS_S3_BUCKET_NAME!,
            Prefix: prefix
        });

        const storedImages: StoredImage[] = [];
        let isTruncated = true;
        let continuationToken: string | undefined;

        while (isTruncated) {
            const response: ListObjectsV2CommandOutput = await s3Client.send(
                new ListObjectsV2Command({
                    ...command.input,
                    ContinuationToken: continuationToken
                })
            );

            const objects = response.Contents || [];
            for (const object of objects) {
                if (object.Key && object.Key.endsWith('.png')) {
                    storedImages.push({
                        url: `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${object.Key}`,
                        key: object.Key,
                        lastModified: object.LastModified || new Date(),
                        size: object.Size || 0
                    });
                }
            }

            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }

        return storedImages;
    } catch (error) {
        console.error("Error in listStoredImages:", error);
        throw error;
    }
}

export async function deleteImage(key: string): Promise<boolean> {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: AWS_S3_BUCKET_NAME!,
            Key: key
        }));
        return true;
    } catch (error) {
        console.error("Error in deleteImage:", error);
        return false;
    }
}
