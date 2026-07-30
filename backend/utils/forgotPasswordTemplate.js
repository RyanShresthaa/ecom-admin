/**
 * HTML email template for forgot-password OTP.
 */
const forgotPasswordTemplate = ({ name, otp }) => {
  return `
  <div style="font-family:Georgia,serif;color:#2A170F;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 12px">Hi ${name || 'there'},</p>
    <p style="margin:0 0 16px;line-height:1.5">
      You requested a password reset for your Matina Crafts account.
      Use this one-time code:
    </p>
    <div style="background:#FAF6F2;border:1px solid #E2D5C7;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px">
      <p style="margin:0;font-size:28px;letter-spacing:0.35em;font-weight:bold;font-family:monospace">${otp}</p>
    </div>
    <p style="margin:0 0 8px;font-size:14px;color:#664132">This code expires in 1 hour.</p>
    <p style="margin:0;font-size:13px;color:#664132">
      If you did not request this, you can ignore this email.
    </p>
    <p style="margin:24px 0 0;font-size:13px">— Matina Crafts</p>
  </div>
  `;
};

export default forgotPasswordTemplate;
