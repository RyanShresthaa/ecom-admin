/**
 * Zod body validation — use only on high-risk POST bodies (auth, checkout).
 */
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) {
            const msg = result.error.issues[0]?.message || 'Invalid input';
            return res.status(400).json({
                message: msg,
                error: true,
                success: false,
            });
        }
        req.body = result.data;
        next();
    };
}
