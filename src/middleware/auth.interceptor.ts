import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.ts';
import debug from 'debug';
import { ForbiddenError, UnauthorizedError } from '../errors/http-error.ts';
import { AuthService } from '../services/auth.ts';
import { Role } from '../../generated/prisma/enums.ts';

const log = debug(`${env.PROJECT_NAME}:middleware:auth`);
log('Loading authInterceptor middleware...');

const unauthorizedErrorMessage =
    'Authentication failed. Please provide valid credentials.';
const forbiddenError = 'You do not have permission to access this resource.';

export class AuthInterceptor {
    authenticate(req: Request, res: Response, next: NextFunction) {
        log('Authenticating request...');

        const authHeader = req.header('Authorization');
        if (!authHeader) {
            log('No authorization header found');
            return next(new UnauthorizedError(unauthorizedErrorMessage));
        }

        const [type, token] = authHeader.split(' ');
        if (!token || type !== 'Bearer') {
            log('No valid token found in authorization header');
            return next(new UnauthorizedError(unauthorizedErrorMessage));
        }

        try {
            const payload = AuthService.verifyToken(token);
            req.user = payload;
            return next();
        } catch (error) {
            const unauthorizedError = new UnauthorizedError(unauthorizedErrorMessage, {
                cause: error,
            });
            log('Token verification failed', { error });
            return next(unauthorizedError);
        }
    }

    authorize(roles: string[] = []) {
        return (req: Request, res: Response, next: NextFunction) => {
            log('Authorizing request for roles:', roles);
            if (!req.user) {
                log('No user information found in request');
                return next(new UnauthorizedError(unauthorizedErrorMessage));
            }

            if (
                req.user.role !== Role.ADMIN &&
                !roles.includes(req.user.role)
            ) {
                log('User role not authorized', { userRole: req.user.role });
                return next(new ForbiddenError(forbiddenError));
            }

            return next();
        };
    }

    isOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
        log('Checking if user is owner or admin...');
        if (!req.user) {
            log('No user information found in request');
            return next(new UnauthorizedError(unauthorizedErrorMessage));
        }

        const resourceOwnerId = Number(req.params.id);
        // Validado por Zod

        console.log('User info:', req.user);
        console.log('Resource owner ID:', resourceOwnerId);

        if (req.user.role !== Role.ADMIN && req.user.id !== resourceOwnerId) {
            log('User is not owner or admin', {
                userId: req.user.id,
                resourceOwnerId,
            });
            return next(new ForbiddenError(forbiddenError));
        }

        return next();
    }
}
