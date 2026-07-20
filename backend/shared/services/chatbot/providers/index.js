import { CHAT_PROVIDER } from '../constants.js';
import { stubComplete } from './stub.js';
import { openaiComplete } from './openai.js';

/**
 * Resolve chat completion provider.
 * @param {'stub'|'openai'} [name]
 */
export function getChatProvider(name = CHAT_PROVIDER.STUB) {
    const key = String(name || CHAT_PROVIDER.STUB).toLowerCase();
    if (key === CHAT_PROVIDER.OPENAI) {
        return { name: CHAT_PROVIDER.OPENAI, complete: openaiComplete };
    }
    return { name: CHAT_PROVIDER.STUB, complete: stubComplete };
}
