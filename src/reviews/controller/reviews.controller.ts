import { env } from '../../config/env.ts';
import debug from 'debug';
import type { ReviewsRepo } from '../repo/reviews.repo.ts';
import type { Request, Response, NextFunction } from 'express';
import { InternalServerError, NotFoundError } from '../../errors/http-error.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type {
    ReviewCreateBodyDTO,
    ReviewUpdateDTO,
} from '../entities/review.dto.ts';

const log = debug(`${env.PROJECT_NAME}:controller:reviews`);
log('Loading reviews controller...');

export class ReviewsController {
    #repo: ReviewsRepo;
    constructor(repo: ReviewsRepo) {
        this.#repo = repo;
    }

    async getAllFilmsReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const reviews = await this.#repo.getAllFilmsReviews(
                Number(req.params.filmID),
            );
            return res.json(reviews);
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
                log(
                    'Error getting all film reviews: %s',
                    notFoundError.message,
                );
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to get all film reviews',
                { cause: error },
            );
            log('Error getting all film reviews: %s', internalError.message);
            next(internalError);
        }
    }

    async getAllUserReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const reviews = await this.#repo.getAllUserReviews(
                Number(req.params.userID),
            );
            return res.json(reviews);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'User requested not found',
                    {
                        cause: error,
                    },
                );
                log(
                    'Error getting all user reviews: %s',
                    notFoundError.message,
                );
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to get all user reviews',
                { cause: error },
            );
            log('Error getting all user reviews: %s', internalError.message);
            next(internalError);
        }
    }

    // - POST /reviews/:filmId/ [User] -> token :userId

    async createReview(req: Request, res: Response, next: NextFunction) {
        try {
            const reviewData: ReviewCreateBodyDTO = req.body;
            const review = await this.#repo.createReview({
                ...reviewData,
                filmID: Number(req.params.filmID),
                userID: Number(req.user?.id),
            });
            return res.status(201).json(review);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to create review',
                { cause: error },
            );
            log('Error creating review: %s', internalError.message);
            next(internalError);
        }
    }

    async updateReview(req: Request, res: Response, next: NextFunction) {
        try {
            const reviewData: ReviewUpdateDTO = req.body;
            const review = await this.#repo.updateReview(
                Number(req.user?.id),
                Number(req.params.filmID),
                reviewData,
            );
            return res.json(review);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'Review requested not found',
                    {
                        cause: error,
                    },
                );
                log('Error updating review: %s', notFoundError.message);
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to update review',
                { cause: error },
            );
            log('Error updating review: %s', internalError.message);
            return next(internalError);
        }
    }

    async deleteReview(req: Request, res: Response, next: NextFunction) {
        try {
            await this.#repo.deleteReview(
                Number(req.user?.id),
                Number(req.params.filmID),
            );
            return res.status(204).send();
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'Review requested not found',
                    {
                        cause: error,
                    },
                );
                log('Error deleting review: %s', notFoundError.message);
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to delete review',
                { cause: error },
            );
            log('Error deleting review: %s', internalError.message);
            return next(internalError);
        }
    }
}
