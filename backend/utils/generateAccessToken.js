/**
 * Short-lived access JWT (HS256); secret/TTL from config/security.js.
 */
import jwt from 'jsonwebtoken';
import { getAccessSecret, getAccessTokenExpiresIn } from '../config/security.js';

const generateAccessToken = async (userId) => {
    return jwt.sign({ id: userId }, getAccessSecret(), {
        expiresIn: getAccessTokenExpiresIn(),
        algorithm: 'HS256',
    });
};

export default generateAccessToken;
