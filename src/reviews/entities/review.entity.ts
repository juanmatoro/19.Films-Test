import { Decimal } from '@prisma/client/runtime/client';
import { z } from 'zod';

import { FilmModelSchema } from '../../films/entities/film.entity.ts';
import { UserModelWithProfile } from '../../users/entities/user.entity.ts';

export const ReviewModelSchema  = z.object({
    review: z.string(),
    rate: z.instanceof(Decimal),
    date: z.date(),
    get user() {
        return UserModelWithProfile.omit({ reviews: true }).optional();
    },
    get film() {
        return FilmModelSchema.omit({ reviews: true }).optional();
    },
});

// Para crear los schemas específicos 
// para las listas de reviews en películas y usuarios, 
// podemos extender el ReviewBaseModelSchema y 
// añadir los campos de usuario y película según corresponda, 
// pero sin incluir las reviews para evitar la recursividad
// creando para ello una serie de schemas parciales

export const ReviewBaseModelSchema = ReviewModelSchema.omit({
    user: true,
    film: true,
});

const ReviewListProfileModelSchema = z.object({
    firstName: z.string(),
    surname: z.string(),
});

const ReviewListUserModelSchema = z
    .object({
        profile: ReviewListProfileModelSchema.nullable(),
    })
    .nullable();

const ReviewOnFilmListFilmModelSchema = z
    .object({
        title: z.string(),
    })
    .nullable();

const ReviewOnUserListFilmModelSchema = z
    .object({
        title: z.string(),
        year: z.number(),
        director: z.string(),
    })
    .nullable();

export const FilmReviewModelSchema = ReviewBaseModelSchema.extend({
    user: ReviewListUserModelSchema,
    film: ReviewOnFilmListFilmModelSchema,
});

export const UserReviewModelSchema = ReviewBaseModelSchema.extend({
    user: ReviewListUserModelSchema,
    film: ReviewOnUserListFilmModelSchema,
});

export type ReviewBase = z.infer<typeof ReviewBaseModelSchema>; 
export type Review = z.infer<typeof ReviewModelSchema>;
export type FilmReview = z.infer<typeof FilmReviewModelSchema>;
export type UserReview = z.infer<typeof UserReviewModelSchema>;
