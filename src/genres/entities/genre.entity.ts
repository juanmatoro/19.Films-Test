import { z } from 'zod';
import { FilmModelSchema } from '../../films/entities/film.entity.ts';

export const GenreModelSchema = z.object({
    id: z.number(),
    name: z.string(),
});

export const GenreDetailModelSchema = z.object({
    id: z.number(),
    name: z.string(),
    films: z.array(
        FilmModelSchema.omit({
            reviews: true,
        }),
    ),
});

export type Genre = z.infer<typeof GenreModelSchema>;
export type GenreDetail = z.infer<typeof GenreDetailModelSchema>;
