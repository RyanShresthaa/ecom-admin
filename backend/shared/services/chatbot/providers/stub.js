/**
 * Stub chat provider — deterministic replies until a real LLM API is wired.
 */
export async function stubComplete({ messages = [] }) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText = String(lastUser?.content || '').trim();
    const preview = userText.length > 240 ? `${userText.slice(0, 240)}…` : userText;

    const content = preview
        ? `Thanks for reaching out. The chatbot is running in stub mode — no external AI API is connected yet.\n\nYou asked: "${preview}"\n\nWhen you're ready, set CHAT_PROVIDER=openai and OPENAI_API_KEY in backend/.env, then restart the API.`
        : 'Hello! The store chatbot is active in stub mode. Send a message and I will echo a placeholder reply until you connect a real AI provider.';

    return {
        content,
        providerMessageId: null,
        metadata: { stub: true },
    };
}
