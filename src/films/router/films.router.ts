import type { FilmsController } from '../controllers/films.controller.ts';
import { Router } from 'express';
import debug from 'debug';
import { env } from '../../config/env.ts';
import { validateBody, validateParams } from '../../middleware/validations.ts';
import { FilmCreateDTOSchema, FilmUpdateDTOSchema} from '../entities/film.dto.ts';
import { AuthInterceptor } from '../../middleware/auth.interceptor.ts';


const log = debug(`${env.PROJECT_NAME}:router:films`);
log('Loading films router...');

export class FilmsRouter {
    #controller: FilmsController;
    #router: Router;
    #authInterceptor: AuthInterceptor;
    constructor(controller: FilmsController, authInterceptor: AuthInterceptor) {
        log('Initializing films router...');
        this.#controller = controller;
        this.#router = Router();
        this.#authInterceptor = authInterceptor;
    
        this.#router.get('/', this.#controller.getAllFilms.bind(this.#controller));
        this.#router.get('/:id', validateParams(), this.#controller.getFilmById.bind(this.#controller));
        this.#router.post(
            '/',
            validateBody(FilmCreateDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor.authorize(['EDITOR']).bind(this.#authInterceptor),
            this.#controller.createFilm.bind(this.#controller),
        );

        this.#router.patch(
            '/:id',
            validateParams(),
            validateBody(FilmUpdateDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor.authorize(['EDITOR']).bind(this.#authInterceptor),
            this.#controller.updateFilm.bind(this.#controller),
        );

        this.#router.delete(
            '/:id',
            validateParams(),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            //this.#authInterceptor.isOwnerOrAdmin.bind(this.#authInterceptor),
            this.#authInterceptor.authorize(['EDITOR']).bind(this.#authInterceptor),
            this.#controller.deleteFilm.bind(this.#controller),
        );
    
    }

    get router() {
        return this.#router;
    }
}
