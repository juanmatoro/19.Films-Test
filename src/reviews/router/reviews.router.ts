import { Router } from 'express';
import { env } from '../../config/env.ts';
import debug from 'debug';
import type { AuthInterceptor } from '../../middleware/auth.interceptor.ts';
import type { ReviewsController } from '../controller/reviews.controller.ts';
import { validateBody, validateParams } from '../../middleware/validations.ts';
import {
    ReviewCreateBodyDTOSchema,
    ReviewFilmParamsSchema,
    ReviewUpdateDTOSchema,
    ReviewUserParamsSchema,
} from '../entities/review.dto.ts';

const log = debug(`${env.PROJECT_NAME}:router:reviews`);
log('Loading reviews router...');


export class ReviewsRouter {
    #controller: ReviewsController;
    #router: Router;
    #authInterceptor: AuthInterceptor;
    constructor(
        controller: ReviewsController,
        authInterceptor: AuthInterceptor,
    ) {
        log('Initializing reviews router...');
        this.#router = Router();
        this.#controller = controller;
        this.#authInterceptor = authInterceptor;
    
        this.#router.get(
            '/films/:filmID',
            validateParams(ReviewFilmParamsSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.getAllFilmsReviews.bind(this.#controller),
        );

        this.#router.get(
            '/users/:userID',
            validateParams(ReviewUserParamsSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.getAllUserReviews.bind(this.#controller),
        );

        this.#router.post(
            '/:filmID',
            validateParams(ReviewFilmParamsSchema),
            validateBody(ReviewCreateBodyDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.createReview.bind(this.#controller),
        );

        this.#router.patch(
            '/:filmID',
            validateParams(ReviewFilmParamsSchema),
            validateBody(ReviewUpdateDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.updateReview.bind(this.#controller),
        );

        this.#router.delete(
            '/:filmID',
            validateParams(ReviewFilmParamsSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.deleteReview.bind(this.#controller),
        );
    
    }

        get router() {
        return this.#router;
    }
}
