import { env } from '../../config/env.ts';
import debug from 'debug';
import type { GenresController } from '../controller/genres.controller.ts';
import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validations.ts';
import type { AuthInterceptor } from '../../middleware/auth.interceptor.ts';
import { GenreCreateDTOSchema } from '../entities/genre.dto.ts';

const log = debug(`${env.PROJECT_NAME}:router:genres`);
log('Loading genres router...');

export class GenresRouter {
    #controller: GenresController;
    #router: Router;
    #authInterceptor: AuthInterceptor;
    constructor(
        controller: GenresController,
        authInterceptor: AuthInterceptor,
    ) {
        log('Initializing genres router...');
        this.#router = Router();
        this.#controller = controller;
        this.#authInterceptor = authInterceptor;

        this.#router.get(
            '/',
            this.#controller.getAllGenres.bind(this.#controller),
        );

        this.#router.get(
            '/:id',
            validateParams(),
            this.#controller.getGenreById.bind(this.#controller),
        );

        this.#router.post(
            '/',
            validateBody(GenreCreateDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor
                .authorize(['EDITOR'])
                .bind(this.#authInterceptor),
            this.#controller.createGenre.bind(this.#controller),
        );

        this.#router.put(
            '/:id',
            validateParams(),
            validateBody(GenreCreateDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor
                .authorize(['EDITOR'])
                .bind(this.#authInterceptor),
            this.#controller.updateGenre.bind(this.#controller),
        );

        this.#router.delete(
            '/:id',
            validateParams(),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor
                .authorize(['EDITOR'])
                .bind(this.#authInterceptor),
            this.#controller.deleteGenre.bind(this.#controller),
        );
    }

    get router() {
        return this.#router;
    }
}
