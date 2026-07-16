/**
 * Zod body validation — use only on high-risk POST bodies (auth, checkout).
 */
export function validateBody(schema) {
    // Attach Zod body validation to route handlers using this middleware.
    return (req, res, next) => {
        // Reject request when payload shape/rules fail schema checks.
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) {
            const msg = result.error.issues[0]?.message || 'Invalid input';
            return res.status(400).json({
                message: msg,
                error: true,
                success: false,
            });
        }
        // Replace body with parsed output so controllers receive normalized data.
        req.body = result.data;
        next();
    };
}
