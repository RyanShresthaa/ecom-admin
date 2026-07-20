/**
 * OpenAI provider placeholder — implement when OPENAI_API_KEY is configured.
 */
export async function openaiComplete() {
    const err = new Error(
        'OpenAI chat is not configured yet. Set OPENAI_API_KEY and implement providers/openai.js, or use CHAT_PROVIDER=stub.',
    );
    err.status = 501;
    err.code = 'OPENAI_NOT_IMPLEMENTED';
    throw err;
}
