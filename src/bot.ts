import OpenAI from 'openai';

import { OPENROUTER_API_KEY, PROJECT_BUNDLE_URL, ChainId, CHAIN_CONFIG } from './config';
import createSubProject, { parseUserMessage } from './createSubProject';
import { generateAndStoreImage } from './services/imageService';
import { getMarketData } from './services/marketDataService';
import character from './character.json';
import { getTokenMetadata } from './services/metadataService';
import { publishCast } from './neynarClient';
import { getContextFromRelatedThreads } from './services/messageHistoryService';

// Validating necessary environment variables or configurations.
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

// TODO: split prompt context between bot responses and image generation
// TODO: add some form of bot memory
/**
 * Function to generate a contextual prompt for a user's message.
 * @param userMessage - The user's message.
 * @param requiredResponseInformation - The required information to include in the response.
 * @param castHash - The cast hash associated with the message.
 */
export async function getContextualPrompt(
  userMessage: string,
  requiredResponseInformation: string,
  castHash: string
): Promise<string> {
  // Get context from related threads
  const threadContext = await getContextFromRelatedThreads(castHash);

  // generate a contextual prompt for the bot
  const prompt = `
    Generate a response (max 280 characters) for a user taking into account the following information:
    - The user message is: ${userMessage}
    - You are a helpful bot named ${character.name}
    - Your bio is: ${character.bio}
    - Your lore is: ${character.lore}
    - Your personality is: ${character.personality}
    - The response must include the following information: ${requiredResponseInformation}
    ${threadContext ? `\n${threadContext}` : ''}
  `;
  return prompt;
}

/**
 * Function to generate an error response using OpenRouter.
 * @param parentHash - The hash of the parent cast.
 * @param hookData - The cast triggering the bot.
 * @param requiredPromptInfo - The required information to include in the response.
 */
export async function errorAIResponse(
  parentHash: string,
  hookData: any,
  requiredPromptInfo: string,
): Promise<{ hash: string; response: string }> {
  const errorPrompt = await getContextualPrompt(hookData.data.text, requiredPromptInfo, hookData.data.hash)

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
    'Sorry, I encountered an error while creating your site. Please try again later 🔧';
  const hash = await publishCast(responseContent, parentHash);
  return { hash, response: responseContent };
}

// TODO: need to split this based upon whether the user is trying to create a sub-project or not
// TODO: update the hookData type - it's a PostCastResponseCast but the type is not exported
/**
 * Function to generate a message in response to a user's message.
 * @param hookData - The cast triggering the bot.
 */
export async function respondToMessage(
  hookData: any,
): Promise<{ hash: string; response: string; imageUrl?: string }> {
  const parentHash = hookData.data.hash;

  try {
    console.log('responding to message');
    const { chainId, tokenTicker, tokenAddress } = parseUserMessage(hookData.data.text);
    const chainIdInt = parseInt(chainId) as ChainId;

    // retrieve the token metadata
    const tokenMetadata = await getTokenMetadata(tokenAddress, chainIdInt);

    // generate a custom image to use for the sub-project site
    const imagePrompt = `
      Generate a cover image for a crypto token with the ticker ${tokenTicker}
      The token is on the ${CHAIN_CONFIG[chainIdInt].name} chain.
      The token description is: ${tokenMetadata?.description}.
      The user asked: ${hookData.data.text}
    `;
    const fileName = `${tokenTicker}-${tokenAddress}-${chainId}`;
    const imageUrl = await generateAndStoreImage(imagePrompt, tokenAddress, fileName);
    console.log('Generated image URL:', imageUrl);

    // Create the sub project
    const receipt = await createSubProject(hookData.data);

    // Get the sub project ID from the transaction events
    const subProjectCreatedEvent = receipt.logs.find(
      (log: any) => log.eventName === 'SubProjectCreated',
    );
    const subProjectId = subProjectCreatedEvent.args[1];

    // generate the required prompt for responding to a subproject creation
    const requiredPromptInfo = `
      The response must:
      1. Confirm the project creation
      2. Mention the token ${tokenTicker} with address ${tokenAddress} on the ${CHAIN_CONFIG[chainIdInt].name} chain.
      3. Take into account the token description: ${tokenMetadata?.description}
      4. Provide a link to the sub project site: ${PROJECT_BUNDLE_URL}${subProjectId}
    `
    const prompt = await getContextualPrompt(hookData.data.text, requiredPromptInfo, hookData.data.hash)

    // generate the response using the prompt
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

    // run getMarketData asynchronously on the new subProject
    Promise.resolve()
      .then(() => getMarketData(tokenAddress, chainIdInt))
      .catch((error) => console.error('error getting market data for new subproject', error));

    return { hash, response: responseContent, imageUrl: imageUrl };
  } catch (error: any) {
    console.error('error responding to message', error);
    const requiredPromptInfo = `
      The response must inform the user that the website creation failed and pass on the error message:
      - Error: ${error}
    `
    return errorAIResponse(parentHash, hookData, requiredPromptInfo);
  }
}
