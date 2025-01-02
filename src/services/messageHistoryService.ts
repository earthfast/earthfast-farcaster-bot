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
    const entry = message.parentHash ? threadHistory[message.parentHash] : null;
    if (!entry) {
        return message.castHash;
    }
    
    // Find earliest message in thread
    const earliestMessage = entry.messages.reduce((earliest, current) => 
        current.timestamp < earliest.timestamp ? current : earliest
    );
    
    return earliestMessage.castHash;
}

export function addMessage(message: BotMessage): void {
    const rootHash = getRootHash(message);
    const now = Date.now();

    // Initialize or get existing thread
    const entry = threadHistory[rootHash] || { messages: [], lastUpdated: now };

    // Add new message
    entry.messages.push(message);
    entry.lastUpdated = now;

    // Keep only messages from the last 7 days
    entry.messages = entry.messages.filter(msg => 
        (now - msg.timestamp) < HISTORY_DURATION
    );

    // Invalidate summary when new messages are added
    if (entry.summary) {
        entry.summary = undefined;
    }

    threadHistory[rootHash] = entry;
}

export function getThread(rootHash: string): BotMessage[] {
    const entry = threadHistory[rootHash];
    if (!entry) {
        return [];
    }

    return entry.messages.sort((a, b) => a.timestamp - b.timestamp);
}

export function getRelatedThreads(castHash: string): string[] {
    // Find threads that mention this cast hash in their messages
    return Object.entries(threadHistory)
        .filter(([rootHash, entry]) => 
            entry.messages.some(msg => 
                msg.content.includes(castHash) || 
                msg.parentHash === castHash
            )
        )
        .map(([rootHash]) => rootHash);
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
    const summaries: string[] = [];

    for (const threadHash of relatedThreads.slice(0, maxThreads)) {
        const summary = await getThreadSummary(threadHash);
        if (summary) {
            summaries.push(`Thread ${threadHash.slice(0, 8)}: ${summary.summary}`);
        }
    }

    return summaries.length > 0 
        ? `Related discussions:\n${summaries.join('\n')}`
        : '';
}
