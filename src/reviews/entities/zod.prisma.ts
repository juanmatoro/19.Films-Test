/* eslint-disable @typescript-eslint/no-unused-vars */


import type { Review } from '../../../generated/prisma/client.ts';
import type {
    ReviewModel,
    ReviewUncheckedCreateInput,
    ReviewUserIDFilmIDCompoundUniqueInput,
} from '../../../generated/prisma/models.ts';
import type { Assert, IsExact } from '../../types/tools.ts';
import type { ReviewCreateBodyDTO, ReviewCreateDTO, ReviewFilmParamsDTO, ReviewParamsDTO, ReviewUpdateDTO, ReviewUserParamsDTO } from './review.dto.ts';

// Desde Prisma podemos obtener los tipos correspondientes
// - al modelo de datos (e.g. FilmModel o GenreModel)
// - a los datos que Prisma acepta en una operación (e.g. FilmCreateInput)

// A partir de ellos definimos shapes para expresar el contrato estructural
// de las operaciones de la aplicación con DTOs más planos y cómodos para HTTP.


type ReviewCreateShape = Pick<
    ReviewUncheckedCreateInput,
    'review' | 'userID' | 'filmID'
> & {
    rate: number;
};

type ReviewUpdateShape = Partial<Pick<ReviewCreateShape, 'review' | 'rate'>>;

type ReviewParamsShape = ReviewUserIDFilmIDCompoundUniqueInput;

// Tipos que exportaríamos normalmente,
// contrastados con los tipos de Prisma para garantizar compatibilidad

type _ReviewCheck = Assert<IsExact<Review, ReviewModel>>;

type _ReviewCreateBodyDTOCheck = Assert<
    IsExact<ReviewCreateBodyDTO, Omit<ReviewCreateShape, 'userID' | 'filmID'>>
>;

type _ReviewCreateDTOCheck = Assert<
    IsExact<ReviewCreateDTO, ReviewCreateShape>
>;

type _ReviewUpdateDTOCheck = Assert<
    IsExact<ReviewUpdateDTO, ReviewUpdateShape>
>;

type _ReviewParamsDTOCheck = Assert<
    IsExact<ReviewParamsDTO, ReviewParamsShape>
>;

type _ReviewFilmParamsDTOCheck = Assert<
    IsExact<ReviewFilmParamsDTO, Pick<ReviewParamsShape, 'filmID'>>
>;

type _ReviewUserParamsDTOCheck = Assert<
    IsExact<ReviewUserParamsDTO, Pick<ReviewParamsShape, 'userID'>>
>;
