/**
 * HTML email template for email verification link (basic XSS escapes on name/url).
 */
const verifyEmailTemplate = (name, url) => {
    const safeName = String(name || 'there').replace(/</g, '&lt;');
    const safeUrl = String(url || '#').replace(/"/g, '&quot;');
    return `
    <p>Dear ${safeName}</p>
    <p>Thank you for registering.</p>
    <a href="${safeUrl}" style="color: white;background: black; margin-top: 12px; padding: 8px 16px; text-decoration: none; display: inline-block;">
        Verify Email
    </a>
    `;
};

export default verifyEmailTemplate;
