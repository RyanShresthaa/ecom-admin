/**
 * Chatbot orchestration — load history, call provider, return assistant reply.
 * Real LLM API wiring goes in providers/ (stub is active by default).
 */
import { getChatProvider } from './providers/index.js';
import { CHAT_PROVIDER, DEFAULT_CHAT_MAX_HISTORY } from './constants.js';

function maxHistory() {
    const n = Number(process.env.CHAT_MAX_HISTORY);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : DEFAULT_CHAT_MAX_HISTORY;
}

function resolveProviderName() {
    return String(process.env.CHAT_PROVIDER || CHAT_PROVIDER.STUB).toLowerCase();
}

/**
 * Generate an assistant reply for a user message.
 * @param {{ messages: Array<{ role: string, content: string }>, sessionContext?: object }} input
 */
export async function completeChat({ messages = [], sessionContext = {} }) {
    const provider = getChatProvider(resolveProviderName());
    const history = messages.slice(-maxHistory());
    const result = await provider.complete({ messages: history, sessionContext });
    return {
        provider: provider.name,
        content: String(result.content || '').trim(),
        providerMessageId: result.providerMessageId ?? null,
        metadata: result.metadata ?? {},
    };
}

/** Safe status for admin UI — no secrets. */
export function getChatbotStatus() {
    const provider = resolveProviderName();
    return {
        provider,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        maxHistory: maxHistory(),
    };
}
