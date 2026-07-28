import crypto from 'crypto';

/** Cryptographically secure 6-digit OTP for password reset */
const generateOtp = () => crypto.randomInt(100000, 1000000);

export default generateOtp;
