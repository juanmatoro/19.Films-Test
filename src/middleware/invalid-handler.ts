import type { Response, Request, NextFunction } from 'express';
import { env } from '../config/env.ts';
import debug from 'debug';
import { NotFoundError } from '../errors/http-error.ts';

const log = debug(`${env.PROJECT_NAME}:invalid-routes`);
log('Loading invalid routes handler...');

export const invalidRoutes = (
    _req: Request,
    _res: Response,
    next: NextFunction,
) => {
    log('Calling errorHandler for 404 error');
    const error = new NotFoundError('Resource not found');
    next(error);
};
