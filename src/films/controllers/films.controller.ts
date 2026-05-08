import { env } from '../../config/env.ts';
import debug from 'debug';
import type { FilmsRepo } from '../repos/films.repo.ts';
import type { Request, Response, NextFunction } from 'express';
import type { Film } from '../entities/film.entity.ts';
import type { FilmUpdateDTO } from '../entities/film.dto.ts';
import { InternalServerError, NotFoundError } from '../../errors/http-error.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const log = debug(`${env.PROJECT_NAME}:controller:films`);
log('Loading films controller...');

export class FilmsController {
    #repo: FilmsRepo;
    constructor(repo: FilmsRepo) {
        this.#repo = repo;
    }

    async getAllFilms(req: Request, res: Response, next: NextFunction) {
        try {
            log('Getting all films...');
            const films: Film[] = await this.#repo.getAllFilms();
            return res.json(films);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to get all films',
                { cause: error },
            );
            log('Error getting all films: %s', internalError.message);
            return next(internalError);
        }
    }

    async getFilmById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Get Film: %s', id);
            const film: Film = await this.#repo.getFilmByID(id);
            return res.json(film);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'Film requested not found',
                    {
                        cause: error,
                    },
                );
                log('Error getting film by id: %s', notFoundError.message);
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to get film by id',
                { cause: error },
            );
            log('Error getting film by id: %s', internalError.message);
            return next(internalError);
        }
    }

    async createFilm(req: Request, res: Response, next: NextFunction) {
        try {
            const filmData = req.body;
            log('Creating film: %O', filmData);
            const newFilm: Film = await this.#repo.createFilm(filmData);
            return res.status(201).json(newFilm);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to create film',
                { cause: error },
            );
            log('Error creating film: %s', internalError.message);
            internalError.cause = error;
            return next(internalError);
        }
    }

    async updateFilm(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            log('Updating film with ID: %O', id);
            const filmData: FilmUpdateDTO = req.body;
            const film: Film = await this.#repo.updateFilm(id, filmData);
            return res.json(film);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'Film for updated not found',
                    {
                        cause: error,
                    },
                );
                log('Error updating film: %s', notFoundError.message);
                return next(notFoundError);
            }
            const internalError = new InternalServerError(
                'Failed to update film',
                { cause: error },
            );
            log('Error updating film: %s', internalError.message);
            return next(internalError);
        }
    }

    async deleteFilm(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            log('Deleting film with ID: %O', id);
            await this.#repo.deleteFilm(id);
            return res.status(204).send();
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'Film for deletion not found',
                    {
                        cause: error,
                    },
                );
                log('Error deleting film: %s', notFoundError.message);
                return next(notFoundError);
            }
            const internalError = new InternalServerError(
                'Failed to delete film',
                { cause: error },
            );
            log('Error deleting film: %s', internalError.message);
            return next(internalError);
        }
    }
}
