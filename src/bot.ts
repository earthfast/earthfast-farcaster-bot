import { isApiErrorResponse } from '@neynar/nodejs-sdk';
import OpenAI from 'openai';

import neynarClient from './neynarClient';
import { SIGNER_UUID, NEYNAR_API_KEY, OPENROUTER_API_KEY, PROJECT_BUNDLE_URL } from './config';
import createSubProject, { parseUserMessage } from './createSubProject';
import { generateAndStoreImage } from './imageService';

// Validating necessary environment variables or configurations.
if (!SIGNER_UUID) {
  throw new Error('SIGNER_UUID is not defined');
}

if (!NEYNAR_API_KEY) {
  throw new Error('NEYNAR_API_KEY is not defined');
}

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is not defined');
}

// Initialize OpenRouter client
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    'X-Title': 'PagePlex',
  },
});

/**
 * Function to generate an error response using OpenRouter.
 * @param error - The error message.
 * @param parentHash - The hash of the parent cast.
 */
export async function errorAIResponse(
  error: string,
  parentHash: string,
): Promise<{ hash: string; response: string }> {
  const errorPrompt = `
        Generate a friendly and concise response (max 280 characters) for a user who tried to create a sub-project but encountered an error:
        - Error: ${error}
    `;

  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: errorPrompt,
      },
    ],
  });

  const responseContent =
    completion.choices[0]?.message?.content ||
    'Sorry, I encountered an error while creating your sub-project. Please try again later 🔧';
  const hash = await publishCast(responseContent, parentHash);
  return { hash, response: responseContent };
}

// TODO: update the hookData type - it's a PostCastResponseCast but the type is not exported
/**
 * Function to generate a message in response to a user's message.
 * @param hookData - The cast triggering the bot.
 */
export async function respondToMessage(hookData: any): Promise<{ hash: string; response: string, imageUrl?: string }> {
  const parentHash = hookData.data.hash;
  
  try {
    console.log('responding to message');
    const { chainId, tokenTicker, tokenAddress } = parseUserMessage(hookData.data.text);

    const imagePrompt = `Generate a logo for a crypto token with the ticker ${tokenTicker}`;
    const imageUrl = await generateAndStoreImage(imagePrompt, tokenAddress, imagePrompt);
    console.log('Generated image URL:', imageUrl);

    // Create the sub project
    const receipt = await createSubProject(hookData.data);

    // Get the sub project ID from the transaction events
    const subProjectCreatedEvent = receipt.logs.find(
      (log: any) => log.eventName === 'SubProjectCreated',
    );
    const subProjectId = subProjectCreatedEvent.args[1];

    // Generate a contextual response using OpenRouter
    const prompt = `
            Generate a friendly and concise response (max 280 characters) for a user who just created a sub-project with these details:
            - Token Name: ${tokenTicker}
            - Token Address: ${tokenAddress}
            - Chain ID: ${chainId}

            The response should:
            1. Confirm the project creation
            2. Mention the token and amount
            3. Be encouraging and positive
            4. Use no more than 1-2 emojis
            5. Provide a link to the sub project site: ${PROJECT_BUNDLE_URL}${subProjectId}
        `;

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseContent =
      completion.choices[0]?.message?.content || 'Project created successfully!';
    console.log('AI generated response', responseContent);
    
    // publish the response to farcaster
    const hash = await publishCast(responseContent, parentHash);

    return { hash, response: responseContent, imageUrl: imageUrl };
  } catch (error: any) {
    console.error('error responding to message', error);
    return errorAIResponse(error.message, parentHash);
  }
}

/**
 * Function to publish a message (cast) using neynarClient.
 * @param msg - The message to be published.
 * @param parentCastHash - The hash of the parent cast.
 */
const publishCast = async (msg: string, parentCastHash: string): Promise<string> => {
  try {
    console.log('publishing cast');
    // Use the neynarClient to publish the cast.
    const postCastResponse = await neynarClient.publishCast({
      signerUuid: SIGNER_UUID,
      text: msg,
      parent: parentCastHash,
    });
    console.log('Cast published successfully');
    return postCastResponse.cast.hash;
  } catch (err) {
    // Error handling, checking if it's an API response error.
    if (isApiErrorResponse(err)) {
      console.log(err.response.data);
    } else console.log(err);
    return '';
  }
};
