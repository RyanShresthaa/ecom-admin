/**
 * Long-lived refresh JWT persisted on user row; secret/TTL from config/security.js.
 */
import jwt from 'jsonwebtoken';
import { updateUser } from '../models/user.model.js';
import { getRefreshSecret, getRefreshTokenExpiresIn } from '../config/security.js';

const generateRefreshToken = async (userId) => {
    const token = jwt.sign({ id: userId }, getRefreshSecret(), {
        expiresIn: getRefreshTokenExpiresIn(),
        algorithm: 'HS256',
    });
    await updateUser(userId, { refresh_token: token });
    return token;
};

export default generateRefreshToken;
