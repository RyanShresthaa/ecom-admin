/**
 * Resolve or mint a guest cart UUID (cookie + header).
 * Header: X-Guest-Id | Cookie: guest_id
 */
import crypto from 'crypto';
import { getAccessCookieOptions } from '../config/security.js';

export const GUEST_COOKIE = 'guest_id';
export const GUEST_HEADER = 'x-guest-id';
export const GUEST_CART_TTL_DAYS = Number(process.env.GUEST_CART_TTL_DAYS || 14);

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
    // Validate incoming guest ids from header/cookie/body.
    return typeof v === 'string' && UUID_RE.test(v.trim());
}

export function guestExpiresAt(days = GUEST_CART_TTL_DAYS) {
    // Compute guest cart expiration used by cart persistence.
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function readGuestId(req) {
    // Resolve guest identity from request sources in priority order.
    const fromHeader = req.headers?.[GUEST_HEADER] || req.headers?.['X-Guest-Id'];
    const fromCookie = req.cookies?.[GUEST_COOKIE];
    const fromBody = req.body?.guestId || req.body?.guest_id;
    const raw = String(fromHeader || fromCookie || fromBody || '').trim();
    return isUuid(raw) ? raw.toLowerCase() : null;
}

export function setGuestCookie(res, guestId) {
    // Persist guest cart identity and mirror it back to API clients.
    const accessOpts = getAccessCookieOptions();
    res.cookie(GUEST_COOKIE, guestId, {
        httpOnly: true,
        secure: accessOpts.secure,
        sameSite: accessOpts.sameSite,
        path: '/',
        maxAge: GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    res.setHeader('X-Guest-Id', guestId);
}

export function clearGuestCookie(res) {
    // Clear guest cart identity after merge or logout flows.
    const accessOpts = getAccessCookieOptions();
    res.clearCookie(GUEST_COOKIE, {
        httpOnly: true,
        secure: accessOpts.secure,
        sameSite: accessOpts.sameSite,
        path: '/',
    });
}

/**
 * After optionalAuth: ensure req.cartOwner = { userId } | { guestId }.
 * Mints guest UUID when anonymous.
 */
export function resolveCartOwner(req, res, next) {
    // Bind cart ownership to authenticated user or minted guest UUID.
    if (req.userId) {
        req.cartOwner = { userId: req.userId, guestId: null };
        return next();
    }
    let guestId = readGuestId(req);
    if (!guestId) {
        guestId = crypto.randomUUID();
        setGuestCookie(res, guestId);
    } else {
        setGuestCookie(res, guestId); // refresh TTL cookie
    }
    req.guestId = guestId;
    req.cartOwner = { userId: null, guestId };
    next();
}

/** Require cart owner (user or guest) — always true after resolveCartOwner */
export function requireCartOwner(req, res, next) {
    // Guard cart routes that must run with a resolved owner context.
    if (!req.cartOwner?.userId && !req.cartOwner?.guestId) {
        return res.status(400).json({
            message: 'Cart owner missing',
            error: true,
            success: false,
        });
    }
    next();
}
