import { env } from '../../config/env.ts';
import debug from 'debug';
import type { GenresRepo } from '../repo/genres.repo.ts';
import type { Request, Response, NextFunction } from 'express';
import { InternalServerError, NotFoundError } from '../../errors/http-error.ts';
import type { Genre, GenreDetail } from '../entities/genre.entity.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const log = debug(`${env.PROJECT_NAME}:controller:genres`);
log('Loading genres controller...');

export class GenresController {
    #repo: GenresRepo;
    constructor(repo: GenresRepo) {
        this.#repo = repo;
    }

    async getAllGenres(req: Request, res: Response, next: NextFunction) {
        try {
            log('Getting all genres...');
            const genres: Genre[] = await this.#repo.getAllGenres();
            return res.json(genres);
        } catch (error) {
            const finalError = new InternalServerError(
                'Failed to get all genres',
                { cause: error },
            );
            log('Error getting all genres: %s', finalError.message);
            return next(error);
        }
    }

    async getGenreById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Get Genre: %s', id);
            const genre: GenreDetail = await this.#repo.getGenreByID(id);
            return res.json(genre);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError('Genre requested not found', {
                    cause: error,
                });
                log('Error getting genre by id: %s', notFoundError.message);
                return next(notFoundError);
            }
            const finalError = new InternalServerError(
                'Failed to get genre by id',
                { cause: error },
            );
            log('Error getting genre by id: %s', finalError.message);
            return next(finalError);
        }
    }

    async createGenre(req: Request, res: Response, next: NextFunction) {
        try {
            const name: string = req.body.name;
            // Validated previously with zod middleware
            log('Creating genre: %s', name);
            const genre: Genre = await this.#repo.createGenre(name);
            return res.status(201).json(genre);
        } catch (error) {
            const finalError = new InternalServerError(
                'Failed to create genre',
                { cause: error },
            );
            log('Error creating genre: %s', finalError.message);
            return next(finalError);
        }
    }

    async updateGenre(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            const name: string = req.body.name;
            // Validated previously with zod middleware
            log('Updating genre with ID: %s', id);
            const genre: Genre = await this.#repo.updateGenre(id, name);
            return res.json(genre);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError('Genre for update not found', {
                    cause: error,
                });
                log('Error updating genre: %s', notFoundError.message);
                return next(notFoundError);
            }
            const finalError = new InternalServerError(
                'Failed to update genre',
                { cause: error },
            );
            log('Error updating genre: %s', finalError.message);
            return next(finalError);
        }
    }

    async deleteGenre(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Deleting genre: %s', id);
            await this.#repo.deleteGenre(id);
            return res.status(204).send();
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError('Genre for deletion not found', {
                    cause: error,
                });
                log('Error deleting genre: %s', notFoundError.message);
                return next(notFoundError);
            }
            const finalError = new InternalServerError(
                'Failed to delete genre',
                { cause: error },
            );
            log('Error deleting genre: %s', finalError.message);
            return next(finalError);
        }
    }
}
