import type { JwtPayload } from 'jsonwebtoken';
import type { UserCredentials } from '../users/entities/user.entity.ts';

export interface TokenPayload extends JwtPayload, UserCredentials {}

export interface LoginResult {
    token: string;
    credentials: UserCredentials;
}
