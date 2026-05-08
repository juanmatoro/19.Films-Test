import type { AppPrismaClient } from './config/db-config.ts';
import type { TokenPayload } from './types/login.ts';
import { env } from './config/env.ts';
import debug from 'debug';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { customHeaders } from './middleware/custom-headers.ts';
import { errorHandler } from './middleware/error-handler.ts';


import { HomeView } from './views/home.ts';
import { AuthInterceptor } from './middleware/auth.interceptor.ts';

import { UsersRepo } from './users/repos/users.repo.ts';
import { UsersController } from './users/controllers/users.controller.ts';
import { UsersRouter } from './users/router/users.router.ts';

import { FilmsRepo } from './films/repos/films.repo.ts';
import { FilmsController } from './films/controllers/films.controller.ts';
import { FilmsRouter } from './films/router/films.router.ts';

import { GenresRepo } from './genres/repo/genres.repo.ts';
import { GenresController } from './genres/controller/genres.controller.ts';
import { GenresRouter } from './genres/router/genres.router.ts';

import { ReviewsController } from './reviews/controller/reviews.controller.ts';
import { ReviewsRepo } from './reviews/repo/reviews.repo.ts';
import { ReviewsRouter } from './reviews/router/reviews.router.ts';
import { invalidRoutes } from './middleware/invalid-handler.ts';

declare module 'express' {
    interface Request {
        user?: TokenPayload;
    }
}

export const createApp = (prisma: AppPrismaClient) => {
    const log = debug(`${env.PROJECT_NAME}:app`);
    log('Starting Express app...');
    const app = express();
    app.disable('x-powered-by');
    // Middleware Utilities
    app.use(morgan('dev'));
    app.use(
        cors({
            origin: '*',
        }),
    );
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(customHeaders(env.PROJECT_NAME));

    app.use(express.static('public'));

    // Routes

    app.use('/health', (_req, res) => {
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });

    app.get('/', async (_req, res) => {
        log('Received request to root endpoint');
        return res.send(await HomeView.render(true));
    });

    app.get('/api', async (_req, res) => {
        log('Received request to API endpoint');
        return res.send(await HomeView.render(false));
    });

    const authInterceptor = new AuthInterceptor();

    const usersRepo = new UsersRepo(prisma);
    const usersController = new UsersController(usersRepo);
    const usersRouter = new UsersRouter(usersController, authInterceptor);
    app.use('/api/users', usersRouter.router);

    const filmsRepo = new FilmsRepo(prisma);
    const filmsController = new FilmsController(filmsRepo);
    const filmsRouter = new FilmsRouter(filmsController, authInterceptor);
    app.use('/api/films', filmsRouter.router);      

    const genresRepo = new GenresRepo(prisma);
    const genresController = new GenresController(genresRepo);
    const genresRouter = new GenresRouter(genresController, authInterceptor);
    app.use('/api/genres', genresRouter.router);

    const reviewsRepo = new ReviewsRepo(prisma);
    const reviewsController = new ReviewsController(reviewsRepo);
    const reviewsRouter = new ReviewsRouter(reviewsController, authInterceptor);
    app.use('/api/reviews', reviewsRouter.router);


    app.use(invalidRoutes);
    app.use(errorHandler);

    return app;
};

