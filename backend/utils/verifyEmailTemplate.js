/**
 * HTML email template for email-verification OTP (basic XSS escapes on name/otp).
 */
const verifyEmailTemplate = ({ name, otp }) => {
    const safeName = String(name || 'there').replace(/</g, '&lt;');
    const safeOtp = String(otp || '').replace(/</g, '&lt;');
    return `
  <div style="font-family:Georgia,serif;color:#2A170F;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 12px">Hi ${safeName},</p>
    <p style="margin:0 0 16px;line-height:1.5">
      Thanks for creating a Matina Crafts account.
      Enter this one-time code to verify your email:
    </p>
    <div style="background:#FAF6F2;border:1px solid #E2D5C7;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px">
      <p style="margin:0;font-size:28px;letter-spacing:0.35em;font-weight:bold;font-family:monospace">${safeOtp}</p>
    </div>
    <p style="margin:0 0 8px;font-size:14px;color:#664132">This code expires in 1 hour.</p>
    <p style="margin:0;font-size:13px;color:#664132">
      If you did not create an account, you can ignore this email.
    </p>
    <p style="margin:24px 0 0;font-size:13px">— Matina Crafts</p>
  </div>
  `;
};

export default verifyEmailTemplate;
