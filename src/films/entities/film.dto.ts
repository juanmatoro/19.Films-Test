import { z } from 'zod';

const isSingleDecimal = (value: number): boolean =>
    Number.isInteger(value * 10);

export const FilmRateDTOSchema = z.coerce
    .number()
    .min(0)
    .max(9.9)
    .refine(isSingleDecimal, {
        message: 'rate debe tener como máximo un decimal',
    });

export const FilmCreateDTOSchema = z.object({
    title: z.string().trim().min(1).max(255),
    year: z.coerce.number().int(),
    director: z.string().trim().min(1).max(255),
    duration: z.coerce.number().int().positive(),
    poster: z.string().trim().min(1).nullish(),
    rate: FilmRateDTOSchema,
    genres: z
        .array(z.string().trim().min(1))
        .min(1)
        .refine((genres) => new Set(genres).size === genres.length, {
            message: 'genres no debe contener repetidos',
        }),
});

export const FilmUpdateDTOSchema = FilmCreateDTOSchema.partial().strict();


export const FilmParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const FilmQuerySchema = z.object({
    title: z.string().trim().min(1).optional(),
    year: z.coerce.number().int().optional(),
    director: z.string().trim().min(1).optional(),
    genre: z.string().trim().min(1).optional(),
    minRate: FilmRateDTOSchema.optional(),
    maxRate: FilmRateDTOSchema.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
        .enum(['id', 'title', 'year', 'director', 'duration', 'rate'])
        .optional(),
    order: z.enum(['asc', 'desc']).optional(),
});

export type FilmCreateDTO = z.infer<typeof FilmCreateDTOSchema>;
export type FilmUpdateDTO = z.infer<typeof FilmUpdateDTOSchema>;
export type FilmParamsDTO = z.infer<typeof FilmParamsSchema>;
export type FilmQueryDTO = z.infer<typeof FilmQuerySchema>;
