/**
 * Chatbot HTTP handlers — sessions, messages, stub provider replies.
 */
import crypto from 'crypto';
import {
    createChatSession,
    findChatSessionById,
    listChatSessionsByUser,
    listAllChatSessions,
    closeChatSession,
    insertChatMessage,
    listChatMessages,
    getChatHistoryForProvider,
} from '../../shared/models/chat.model.js';
import { completeChat, getChatbotStatus } from '../../shared/services/chatbot/index.js';
import { CHAT_SESSION_STATUS } from '../../shared/services/chatbot/constants.js';

const GUEST_HEADER = 'x-chat-guest-token';

function guestTokenFromRequest(req) {
    return String(req.headers[GUEST_HEADER] || req.body?.guestToken || '').trim() || null;
}

function assertSessionAccess(session, req) {
    if (!session) {
        const err = new Error('Chat session not found');
        err.status = 404;
        throw err;
    }
    if (session.status === CHAT_SESSION_STATUS.CLOSED) {
        const err = new Error('Chat session is closed');
        err.status = 400;
        throw err;
    }
    if (session.userId != null) {
        if (!req.userId || Number(session.userId) !== Number(req.userId)) {
            const err = new Error('Not allowed to access this chat session');
            err.status = 403;
            throw err;
        }
        return;
    }
    const guest = guestTokenFromRequest(req);
    if (!guest || guest !== session.guestToken) {
        const err = new Error('Guest chat token required');
        err.status = 403;
        throw err;
    }
}

async function loadSession(req, sessionId) {
    const session = await findChatSessionById(sessionId);
    assertSessionAccess(session, req);
    return session;
}

function handleError(res, error) {
    const status = error.status || 500;
    return res.status(status).json({
        message: error.message || error,
        error: true,
        success: false,
        ...(error.code ? { code: error.code } : {}),
    });
}

// GET /api/chat/status — public chatbot provider status (no secrets).
export async function getChatStatusController(_req, res) {
    try {
        return res.json({ data: getChatbotStatus(), error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// POST /api/chat/sessions — start a chat (logged-in or guest).
export async function createChatSessionController(req, res) {
    try {
        const title = req.body?.title;
        const userId = req.userId ?? null;
        const guestToken = userId ? null : crypto.randomBytes(24).toString('hex');
        const provider = String(process.env.CHAT_PROVIDER || 'stub').toLowerCase();

        const session = await createChatSession({ userId, guestToken, title, provider });
        return res.status(201).json({
            message: 'Chat session created',
            data: {
                session,
                guestToken: guestToken || undefined,
            },
            error: false,
            success: true,
        });
    } catch (e) {
        return handleError(res, e);
    }
}

// GET /api/chat/sessions — list current user's sessions (auth required).
export async function listChatSessionsController(req, res) {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Login required', error: true, success: false });
        }
        const limit = Math.min(100, Number(req.query.limit) || 30);
        const skip = Math.max(0, Number(req.query.skip) || 0);
        const data = await listChatSessionsByUser(req.userId, { limit, skip });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// GET /api/chat/sessions/:id — session detail.
export async function getChatSessionController(req, res) {
    try {
        const session = await loadSession(req, req.params.id);
        return res.json({ data: session, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// GET /api/chat/sessions/:id/messages — message history.
export async function listChatMessagesController(req, res) {
    try {
        await loadSession(req, req.params.id);
        const limit = Math.min(200, Number(req.query.limit) || 50);
        const beforeId = req.query.beforeId != null ? Number(req.query.beforeId) : undefined;
        const data = await listChatMessages(req.params.id, { limit, beforeId });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// POST /api/chat/sessions/:id/messages — send user message, get assistant reply.
export async function sendChatMessageController(req, res) {
    try {
        const session = await loadSession(req, req.params.id);
        const content = String(req.body?.content || '').trim();
        if (!content) {
            return res.status(400).json({ message: 'content is required', error: true, success: false });
        }

        const userMessage = await insertChatMessage({
            sessionId: session.id,
            role: 'user',
            content,
            provider: session.provider,
        });

        const history = await getChatHistoryForProvider(session.id);
        const reply = await completeChat({
            messages: history,
            sessionContext: { sessionId: session.id, userId: session.userId },
        });

        const assistantMessage = await insertChatMessage({
            sessionId: session.id,
            role: 'assistant',
            content: reply.content,
            provider: reply.provider,
            providerMessageId: reply.providerMessageId,
            metadata: reply.metadata,
        });

        return res.status(201).json({
            message: 'Reply sent',
            data: { userMessage, assistantMessage },
            error: false,
            success: true,
        });
    } catch (e) {
        return handleError(res, e);
    }
}

// POST /api/chat/sessions/:id/close — end session.
export async function closeChatSessionController(req, res) {
    try {
        await loadSession(req, req.params.id);
        const session = await closeChatSession(req.params.id);
        return res.json({ message: 'Chat session closed', data: session, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// GET /api/admin/chat/sessions — staff list all sessions.
export async function adminListChatSessionsController(req, res) {
    try {
        const limit = Math.min(200, Number(req.query.limit) || 50);
        const skip = Math.max(0, Number(req.query.skip) || 0);
        const status = req.query.status ? String(req.query.status) : undefined;
        const data = await listAllChatSessions({ limit, skip, status });
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}

// GET /api/admin/chat/sessions/:id/messages — staff read transcript.
export async function adminListChatMessagesController(req, res) {
    try {
        const session = await findChatSessionById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: 'Chat session not found', error: true, success: false });
        }
        const limit = Math.min(500, Number(req.query.limit) || 100);
        const data = await listChatMessages(req.params.id, { limit });
        return res.json({ data: { session, messages: data }, error: false, success: true });
    } catch (e) {
        return handleError(res, e);
    }
}
