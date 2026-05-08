import type { AppPrismaClient } from '../../config/db-config.ts';
import { env } from '../../config/env.ts';
import debug from 'debug';
import type {
    ReviewCreateDTO,
    ReviewUpdateDTO,
} from '../entities/review.dto.ts';
import type {
    FilmReview,
    ReviewBase,
    UserReview,
} from '../entities/review.entity.ts';

const log = debug(`${env.PROJECT_NAME}:repo:reviews`);
log('Loading reviews repo...');

export class ReviewsRepo {
    #prisma: AppPrismaClient;
    constructor(prisma: AppPrismaClient) {
        this.#prisma = prisma;
    }

    async getAllFilmsReviews(filmID: number): Promise<FilmReview[]> {
        log('Getting all reviews of film %s', filmID);
        return await this.#prisma.review.findMany({
            where: {
                filmID,
            },
            omit: {
                filmID: true,
                userID: true,
            },
            include: {
                user: {
                    select: {
                        profile: {
                            select: {
                                firstName: true,
                                surname: true,
                            },
                        },
                    },
                },
                film: {
                    select: {
                        title: true,
                    },
                },
            },
        });
    }

    async getAllUserReviews(userID: number): Promise<UserReview[]> {
        log('Getting all reviews of user with id %s', userID);
        return await this.#prisma.review.findMany({
            where: {
                userID,
            },
            omit: {
                filmID: true,
                userID: true,
            },
            include: {
                user: {
                    select: {
                        profile: {
                            select: {
                                firstName: true,
                                surname: true,
                            },
                        },
                    },
                },
                film: {
                    select: {
                        title: true,
                        year: true,
                        director: true,
                    },
                },
            },
        });
    }

    async createReview(data: ReviewCreateDTO): Promise<FilmReview> {
        log('Creating review for film %s by user %s', data.filmID, data.userID);
        return await this.#prisma.review.create({
            data: {
                review: data.review,
                rate: data.rate,
                // date: new Date(),
                filmID: data.filmID,
                userID: data.userID,
            },
            omit: {
                filmID: true,
                userID: true,
            },
            include: {
                user: {
                    select: {
                        profile: {
                            select: {
                                firstName: true,
                                surname: true,
                            },
                        },
                    },
                },
                film: {
                    select: {
                        title: true,
                    },
                },
            },
        });
    }

    async updateReview(
        userID: number,
        filmID: number,
        data: ReviewUpdateDTO,
    ): Promise<FilmReview> {
        log('Updating review for film %s by user %s', filmID, userID);
        return await this.#prisma.review.update({
            where: {
                userID_filmID: {
                    userID,
                    filmID,
                },
            },
            data,
            omit: {
                filmID: true,
                userID: true,
            },
            include: {
                user: {
                    select: {
                        profile: {
                            select: {
                                firstName: true,
                                surname: true,
                            },
                        },
                    },
                },
                film: {
                    select: {
                        title: true,
                    },
                },
            },
        });
    }

    async deleteReview(userID: number, filmID: number): Promise<ReviewBase> {
        log('Deleting review for film %s by user %s', filmID, userID);
        return await this.#prisma.review.delete({
            where: {
                userID_filmID: {
                    userID,
                    filmID,
                },
            },
            omit: {
                filmID: true,
                userID: true,
            },
        });
    }
}
