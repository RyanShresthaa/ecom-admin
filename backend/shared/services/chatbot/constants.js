/** Chat provider identifiers — swap stub for a real LLM when ready. */
export const CHAT_PROVIDER = {
    STUB: 'stub',
    OPENAI: 'openai',
};

export const CHAT_MESSAGE_ROLE = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
};

export const CHAT_SESSION_STATUS = {
    ACTIVE: 'active',
    CLOSED: 'closed',
};

/** Max messages sent as context to the provider (env override: CHAT_MAX_HISTORY). */
export const DEFAULT_CHAT_MAX_HISTORY = 20;

/** Max user message length accepted by the API. */
export const CHAT_MAX_MESSAGE_LENGTH = 8000;
