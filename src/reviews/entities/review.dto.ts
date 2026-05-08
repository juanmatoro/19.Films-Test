import { z } from 'zod';

const isSingleDecimal = (value: number): boolean =>
    Number.isInteger(value * 10);

const ReviewRateDTOSchema = z.coerce
    .number()
    .min(0)
    .max(10)
    .refine(isSingleDecimal, {
        message: 'rate debe tener como maximo un decimal',
    });


export const ReviewCreateDTOSchema = z.object({
    review: z.string().trim().min(1),
    rate: ReviewRateDTOSchema,
    userID: z.coerce.number().int().positive(),
    filmID: z.coerce.number().int().positive(),
});

export const ReviewCreateBodyDTOSchema = ReviewCreateDTOSchema.omit({
    userID: true,
    filmID: true,
});

export const ReviewUpdateDTOSchema = z.object({
    review: z.string().trim().min(1).optional(),
    rate: ReviewRateDTOSchema.optional(),
});

export const ReviewFilmParamsSchema = z.object({
    filmID: z.coerce.number().int().positive(),
});

export const ReviewUserParamsSchema = z.object({
    userID: z.coerce.number().int().positive(),
});

export const ReviewParamsSchema = z.object({
    userID: z.coerce.number().int().positive(),
    filmID: z.coerce.number().int().positive(),
});


export type ReviewCreateBodyDTO = z.infer<typeof ReviewCreateBodyDTOSchema>;
export type ReviewCreateDTO = z.infer<typeof ReviewCreateDTOSchema>;
export type ReviewUpdateDTO = z.infer<typeof ReviewUpdateDTOSchema>;
export type ReviewFilmParamsDTO = z.infer<typeof ReviewFilmParamsSchema>;
export type ReviewUserParamsDTO = z.infer<typeof ReviewUserParamsSchema>;
export type ReviewParamsDTO = z.infer<typeof ReviewParamsSchema>;
