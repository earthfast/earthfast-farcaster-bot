import OpenAI from 'openai';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';

import { OPENROUTER_API_KEY, PROJECT_BUNDLE_URL, ChainId, CHAIN_CONFIG, SOLANA_CHAIN_ID } from './config';
import createSubProject from './createSubProject';
import { generateAndStoreImage } from './services/imageService';
import { getMarketData } from './services/marketDataService';
import character from './character.json';
import { getTokenMetadata } from './services/metadataService';
import { publishCast } from './neynarClient';
import { getContextFromRelatedThreads } from './services/messageHistoryService';
import { addMessage } from './services/messageHistoryService';

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

interface MessageIntent {
  type: 'create_site' | 'chat';
  chainId?: string;
  tokenTicker?: string;
  tokenAddress?: string;
}

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

export async function determineMessageIntent(message: string): Promise<MessageIntent> {
  // Check if message contains token address-like pattern and keywords about creating/making/building sites
  const hasTokenAddress = /0x[a-fA-F0-9]{40}/.test(message) || 
                         message.includes('sol') || 
                         message.includes('solana');
  const siteCreationKeywords = ['create', 'make', 'build', 'generate', 'setup', 'deploy'];
  const hasSiteIntent = siteCreationKeywords.some(keyword => 
    message.toLowerCase().includes(keyword) && 
    (message.toLowerCase().includes('site') || message.toLowerCase().includes('page'))
  );

  if (hasTokenAddress && hasSiteIntent) {
    // Extract potential token information
    const words = message.split(' ').filter(Boolean);
    let tokenAddress: string | undefined;

    // Look for token address pattern
    for (const word of words) {
      if (ethers.isAddress(word)) {
        tokenAddress = word;
        break;
      } else if (isValidSolanaAddress(word)) {
        tokenAddress = word;
        break;
      }
    }

    if (tokenAddress) {
      // Use OpenAI to extract chain and ticker information
      const extractionPrompt = `
        Extract the following information from this message about creating a site for a token.
        If you can't determine something with high confidence, return null for that field.
        Message: "${message}"

        Required format (JSON):
        {
          "chainId": "1" for Ethereum, "137" for Polygon, "56" for BSC, "solana" for Solana, "8453" for Base, "42161" for Arbitrum, "10" for Optimism, etc. (or null if unclear),
          "tokenTicker": "the token's ticker symbol or null if unclear"
        }

        Rules:
        - For chainId, default to "1" (Ethereum) if the chain isn't explicitly mentioned
        - The token ticker should be a short symbol (like "ETH", "USDC", etc.)
        - If multiple potential tickers are found, choose the one most likely to be associated with ${tokenAddress}
        - Respond only with the JSON object, no other text
      `;

      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: extractionPrompt }],
        response_format: { type: "json_object" }
      });

      try {
        const extractedInfo = JSON.parse(completion.choices[0]?.message?.content || '{}');
        const chainId = extractedInfo.chainId;
        const tokenTicker = extractedInfo.tokenTicker;

        if (chainId && tokenTicker) {
          return {
            type: 'create_site',
            chainId,
            tokenTicker,
            tokenAddress
          };
        }
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
      }
    }
  }

  return { type: 'chat' };
}

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
    Generate a response (max 320 characters) for a user taking into account the following information:
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

  // Add error response to thread history
  if (hash) {
    addMessage({
      timestamp: Date.now(),
      role: 'assistant',
      content: responseContent,
      castHash: hash,
      parentHash
    });
  }

  return { hash, response: responseContent };
}

/**
 * Function to generate a chat response using OpenRouter.
 */
async function generateChatResponse(
  userMessage: string,
  parentHash: string,
  hookData: any
): Promise<{ hash: string; response: string }> {
  const prompt = await getContextualPrompt(
    userMessage,
    'Engage in friendly conversation while staying in character.',
    hookData.data.hash
  );

  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  const responseContent = completion.choices[0]?.message?.content || 
    'I apologize, but I seem to be having trouble responding right now.';
  
  const hash = await publishCast(responseContent, parentHash);

  if (hash) {
    addMessage({
      timestamp: Date.now(),
      role: 'assistant',
      content: responseContent,
      castHash: hash,
      parentHash
    });
  }

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
  const userMessage = hookData.data.text;

  // Add the incoming user message to history
  addMessage({
    timestamp: new Date(hookData.data.timestamp).getTime(),
    role: 'user',
    content: userMessage,
    castHash: hookData.data.hash,
    parentHash: hookData.data.parent_hash || undefined
  });

  try {
    // Determine the user's intent
    const intent = await determineMessageIntent(userMessage);
    const { chainId, tokenTicker, tokenAddress } = intent;

    if (!chainId || !tokenTicker || !tokenAddress || intent.type === 'chat') {
      return generateChatResponse(
        userMessage,
        parentHash,
        hookData
      );
    }

    const chainIdParsed = chainId === SOLANA_CHAIN_ID ? SOLANA_CHAIN_ID as ChainId : parseInt(chainId) as ChainId;

    // retrieve the token metadata
    const tokenMetadata = await getTokenMetadata(tokenAddress, chainIdParsed);

    // generate prompt instructions to use for the sub-project site's cover image
    const imagePrompt = `
      Generate a relevant cover image for a crypto token with the ticker ${tokenTicker}
      The token is on the ${CHAIN_CONFIG[chainIdParsed].name} chain.
      The token description is: ${tokenMetadata?.description}.
      The user asked: ${userMessage}
    `;

    // summarize the image prompt to limit harmful content
    const summarizedImagePrompt = `
      Summarize the following image prompt: ${imagePrompt}
      The summary should capture the essence of the image prompt, while also being creative and unique.
      Avoid any content that may be considered inappropriate or offensive, ensuring the image aligns with content policies
      Mention that the image itself should not contain any text, real or imaginary.
    `;
    const summarizedImagePromptResponse = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: summarizedImagePrompt,
        },
      ],
    });
    const summarizedImagePromptResponseContent = summarizedImagePromptResponse.choices[0]?.message?.content || `Generate a cover image for a crypto token with the ticker ${tokenTicker}`;

    // generate the image
    const imageAddress = chainIdParsed === SOLANA_CHAIN_ID ? tokenAddress : ethers.getAddress(tokenAddress);
    const tokenKey = `${tokenTicker}-${imageAddress}-${chainIdParsed}`;
    const imageUrl = await generateAndStoreImage(summarizedImagePromptResponseContent, tokenKey, 'cover');
    console.log('Generated image URL:', imageUrl);

    // Create the sub project
    const receipt = await createSubProject({
      chainId,
      tokenTicker,
      tokenAddress,
      ...hookData.data
    });

    // Get the sub project ID from the transaction events
    const subProjectCreatedEvent = receipt.logs.find(
      (log: any) => log.eventName === 'SubProjectCreated',
    );
    const subProjectId = subProjectCreatedEvent.args[1];

    // generate the required prompt for responding to a subproject creation
    const requiredPromptInfo = `
      The response must:
      1. Confirm the site creation
      2. Mention the token ${tokenTicker} with address ${tokenAddress} on the ${CHAIN_CONFIG[chainIdParsed].name} chain.
      3. Take into account the token description: ${tokenMetadata?.description} without repeating it to back to the user or overly focusing on the token description.
      4. Provide a link to the site: ${PROJECT_BUNDLE_URL}${subProjectId}
      5. Avoid endorsing the token or suggesting that the token is a good investment.
    `
    const prompt = await getContextualPrompt(userMessage, requiredPromptInfo, hookData.data.hash)

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
    console.log('Published bot response with hash:', hash);

    // run getMarketData asynchronously on the new subProject
    Promise.resolve()
      .then(() => getMarketData(tokenAddress, chainIdParsed))
      .catch((error) => console.error('error getting market data for new subproject', error));

    // Add the bot's response to history
    addMessage({
      timestamp: Date.now(),
      role: 'assistant',
      content: responseContent,
      castHash: hash,
      parentHash: parentHash
    });

    return { hash, response: responseContent, imageUrl: imageUrl };

  } catch (error: any) {
    console.error('error responding to message', error);
    const requiredPromptInfo = `
      The response must inform the user that there was an error processing their request:
      - Error: ${error}
    `;
    return errorAIResponse(parentHash, hookData, requiredPromptInfo);
  }
}
