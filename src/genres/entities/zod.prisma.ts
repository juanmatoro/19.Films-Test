/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FilmModel, ReviewModel } from '../../../generated/prisma/models.ts';
import type {
    GenreCreateInput,
    GenreModel,
} from '../../../generated/prisma/models.ts';
import type { Assert, IsExact } from '../../types/tools.ts';
import type { GenreCreateDTO, GenreUpdateDTO } from './genre.dto.ts';
import type { Genre, GenreDetail } from './genre.entity.ts';

// Shapes del Modelo

type FilmModelShape = FilmModel & {
    genres?: Omit<GenreModel, 'id'>[];
    reviews?: ReviewModel[];
};

type GenreDetailModelShape = GenreModel & {
    films: Omit<FilmModelShape, 'reviews'>[];
};

// Checks de compatibilidad del Modelo

type _GenreCheck = Assert<IsExact<Genre, GenreModel>>;

type _GenreDetailCheck = Assert<
    IsExact<GenreDetail, GenreDetailModelShape>
>;

// Shapes de los DTOs

type GenreCreateShape = Pick<GenreCreateInput, 'name'>;

// Checks de compatibilidad de los DTOs

type _GenreCreateDTOCheck = Assert<
    IsExact<GenreCreateDTO, GenreCreateShape>
>;

type _GenreUpdateDTOCheck = Assert<
    IsExact<GenreUpdateDTO, GenreCreateShape>
>;

