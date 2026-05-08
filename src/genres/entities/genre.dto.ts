import { z } from 'zod';

export const GenreCreateDTOSchema = z.object({
    name: z.string().trim().min(1).max(60),
});

export const GenreUpdateDTOSchema = GenreCreateDTOSchema;


export type GenreCreateDTO = z.infer<typeof GenreCreateDTOSchema>;
export type GenreUpdateDTO = z.infer<typeof GenreUpdateDTOSchema>;
