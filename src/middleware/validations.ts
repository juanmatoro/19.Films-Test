import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.ts';
import debug from 'debug';
import z, { type ZodObject } from 'zod';
import { BadRequestError } from '../errors/http-error.ts';

const log = debug(`${env.PROJECT_NAME}:middleware:validations`);

log('Loading validation middleware...');

export const validateParams = ( schema: ZodObject = z.strictObject({
        id: z.coerce.number().int().positive(),
    })) => {
    return (req: Request, res: Response, next: NextFunction) => {
        log('Validating request params...');
        try {
            schema.parse(req.params);
            return next();
        } catch (error) {
            const paramsText = JSON.stringify(req.params);
            const paramsError = new BadRequestError(`Invalid parameters: ${paramsText}`, {cause: error});
            return next(paramsError);
        }
    };
};

export const validateBody = (schema: ZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        log('Validating request body...');
        try {
            const validationResult = schema.parse(req.body);
            // Actualiza el body de la solicitud con los datos validados
            // incluyendo posibles transformaciones realizadas por Zod
            req.body = validationResult;
            return next();
        } catch (error) {
            const bodyError = new BadRequestError('Invalid request body', {cause: error});
            return next(bodyError);
        }
    };
};
