import OpenAI from 'openai';
import { OPENROUTER_API_KEY } from '../config';

// Initialize OpenRouter client for summarization
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
        'X-Title': 'PagePlex',
    },
});

export interface BotMessage {
    timestamp: number;
    role: 'user' | 'assistant';
    content: string;
    castHash: string;
    parentHash?: string;
}

interface ThreadSummary {
    summary: string;
    lastUpdated: number;
    messageCount: number;
}

interface ThreadEntry {
    messages: BotMessage[];
    summary?: ThreadSummary;
    lastUpdated: number;
}

// TODO: simplify this and store the messages in s3

// Cache duration in milliseconds (7 days)
const HISTORY_DURATION = 7 * 24 * 60 * 60 * 1000;

// Store message history by thread (root cast hash)
const threadHistory: Record<string, ThreadEntry> = {};

// Get the root hash of a thread by traversing parent hashes
function getRootHash(message: BotMessage): string {
    let currentHash = message.castHash;
    let currentMessage = message;

    while (currentMessage.parentHash) {
        // Look for messages with this parent hash
        for (const [hash, entry] of Object.entries(threadHistory)) {
            const parentMessage = entry.messages.find(m => m.castHash === currentMessage.parentHash);
            if (parentMessage) {
                currentHash = parentMessage.castHash;
                currentMessage = parentMessage;
                break;
            }
        }

        // If we didn't find a parent message, break to avoid infinite loop
        if (currentMessage.castHash === currentHash) {
            break;
        }
    }
    
    return currentHash;
}

// Add this helper function to find the root thread for a message
function findRootThread(parentHash: string): ThreadEntry | null {
    // First try direct lookup
    if (threadHistory[parentHash]) {
        return threadHistory[parentHash];
    }

    // If not found directly, search through all threads
    for (const entry of Object.values(threadHistory)) {
        if (entry.messages.some(m => m.castHash === parentHash)) {
            return entry;
        }
    }
    return null;
}

export function addMessage(message: BotMessage): void {
    const now = Date.now();

    // If this message has a parent, try to find its thread
    if (message.parentHash) {
        const rootThread = findRootThread(message.parentHash);

        if (rootThread) {
            // Add to existing thread
            rootThread.messages.push(message);
            rootThread.lastUpdated = now;

            // Invalidate summary
            if (rootThread.summary) {
                rootThread.summary = undefined;
            }

            // If this message was the root of another thread, merge that thread
            const childThread = threadHistory[message.castHash];
            if (childThread) {
                rootThread.messages.push(...childThread.messages);
                delete threadHistory[message.castHash];
            }

            // Sort messages by timestamp
            rootThread.messages.sort((a, b) => a.timestamp - b.timestamp);

            // Store thread under the earliest message's hash
            const earliestMessage = rootThread.messages[0];
            if (earliestMessage.castHash !== message.parentHash) {
                delete threadHistory[message.parentHash];
                threadHistory[earliestMessage.castHash] = rootThread;
            }

            return;
        }
    }

    // If we get here, either:
    // 1. This message has no parent, or
    // 2. We couldn't find the parent's thread
    // Create a new thread
    threadHistory[message.castHash] = {
        messages: [message],
        lastUpdated: now
    };

    logThreadState(message, 'Adding Message');
}

function logThreadState(message: BotMessage, action: string) {
    console.log(`\n=== Thread State After ${action} ===`);
    console.log('Message:', {
        hash: message.castHash,
        parent: message.parentHash,
        content: message.content.substring(0, 50) + '...'
    });
    console.log('Threads:');
    Object.entries(threadHistory).forEach(([hash, entry]) => {
        console.log(`\nThread ${hash}:`);
        entry.messages.forEach(msg => {
            console.log(`- ${msg.role} (${msg.castHash}): ${msg.content.substring(0, 30)}...`);
            if (msg.parentHash) {
                console.log(`  parent: ${msg.parentHash}`);
            }
        });
    });
    console.log('================\n');
}

export function getThread(rootHash: string): BotMessage[] {
    const entry = threadHistory[rootHash];
    if (!entry) {
        return [];
    }

    return entry.messages.sort((a, b) => a.timestamp - b.timestamp);
}

// Update getRelatedThreads to be more thorough
export function getRelatedThreads(castHash: string): string[] {
    console.log('Getting related threads for castHash:', castHash);
    console.log('Thread history:', JSON.stringify(threadHistory, null, 2));

    const relatedHashes = new Set<string>();

    // First pass: find directly related threads
    Object.entries(threadHistory).forEach(([rootHash, entry]) => {
        const isRelated = entry.messages.some(msg =>
            msg.castHash === castHash || // Is this cast
            msg.parentHash === castHash || // Has this cast as parent
            msg.content.includes(castHash) || // Mentions this cast
            // Is in the same thread hierarchy
            (msg.parentHash && entry.messages.some(m => m.castHash === msg.parentHash))
        );

        if (isRelated) {
            relatedHashes.add(rootHash);
        }
    });

    // Second pass: find threads that share messages with related threads
    [...relatedHashes].forEach(relatedHash => {
        const relatedMessages = threadHistory[relatedHash].messages;
        Object.entries(threadHistory).forEach(([rootHash, entry]) => {
            if (!relatedHashes.has(rootHash)) {
                const sharesMessages = entry.messages.some(msg =>
                    relatedMessages.some(relatedMsg =>
                        msg.castHash === relatedMsg.castHash ||
                        msg.parentHash === relatedMsg.castHash ||
                        relatedMsg.parentHash === msg.castHash
                    )
                );
                if (sharesMessages) {
                    relatedHashes.add(rootHash);
                }
            }
        });
    });

    return Array.from(relatedHashes);
}

async function summarizeThread(messages: BotMessage[]): Promise<string> {
    const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

    const prompt = `
        Please summarize the following conversation thread concisely (max 100 words).
        Focus on the key points and any decisions or actions taken.

        Thread:
        ${conversationText}
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

    return completion.choices[0]?.message?.content || 'No summary available.';
}

export async function getThreadSummary(rootHash: string): Promise<ThreadSummary | null> {
    const entry = threadHistory[rootHash];
    if (!entry) {
        return null;
    }

    // Return cached summary if available and thread hasn't been updated
    if (entry.summary && entry.summary.lastUpdated >= entry.lastUpdated) {
        return entry.summary;
    }

    // Generate new summary
    const summary = await summarizeThread(entry.messages);
    entry.summary = {
        summary,
        lastUpdated: Date.now(),
        messageCount: entry.messages.length
    };

    return entry.summary;
}

export async function getContextFromRelatedThreads(castHash: string, maxThreads = 3): Promise<string> {
    const relatedThreads = getRelatedThreads(castHash);
    console.log('Found related threads:', relatedThreads);

    const summaries: string[] = [];

    for (const threadHash of relatedThreads.slice(0, maxThreads)) {
        const summary = await getThreadSummary(threadHash);
        console.log(`Summary for thread ${threadHash}:`, summary);
        if (summary) {
            summaries.push(`Thread ${threadHash.slice(0, 8)}: ${summary.summary}`);
        }
    }

    console.log('Final thread summaries:', summaries);

    return summaries.length > 0 
        ? `Related discussions:\n${summaries.join('\n')}`
        : '';
}
