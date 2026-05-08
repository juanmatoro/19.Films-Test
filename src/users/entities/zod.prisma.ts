/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Exact } from '@prisma/client/runtime/client';
import type {
    ProfileCreateWithoutUserInput,
    ProfileModel,
    UserCreateInput,
    UserModel,
} from '../../../generated/prisma/models.ts';
import type { Assert, IsExact } from '../../types/tools.ts';
import type { Review } from '../../reviews/entities/review.entity.ts';
import type {
    LoginUserDTO,
    ProfileCreateDTO,
    ProfileUpdateDTO,
    RegisterUserDTO,
    UserUpdateDTO,
} from './user.dto.ts';
import type {
    FullUserCredentials,
    Profile,
    User,
    UserCredentials,
    UserWithProfile,
} from './user.entity.ts';

// Desde Prisma podemos obtener los tipos correspondientes
// - al modelo de datos (e,g. UserModel o ProfileModel)
// - a los datos que prisma acepta en una operación (e.g. UserCreateInput o UserCreateUpdate)

// A partir de ellos podemos hablar de shapes para definir el contrato estructural
// de dichas operaciones (Login Register, Update), que acepta sólo la parte
// de los tipos Prisma que realmente queremos exponer en la API.

// Profile Shapes

type ProfileShape = Omit<ProfileModel, 'id'>;

// Profile checks

// Profile En Prisma corresponde a ProfileModel
type _ProfileCheck = Assert<IsExact<Profile, ProfileShape>>;

// ProfileDTO En Prisma corresponde a ProfileCreateWithoutUserInput
type _ProfileCreateDTOCheck = Assert<
    IsExact<ProfileCreateDTO, ProfileCreateWithoutUserInput>
>;

// ProfileUpdateDTO En Prisma corresponde a ProfileUpdateWithoutUserInput
type _ProfileUpdateDTOCheck = Assert<
    IsExact<ProfileUpdateDTO, Partial<ProfileCreateWithoutUserInput>>
>;

// UserModel Shapes

type UserCredentialsShape = Omit<UserModel, 'password'>;

type UserModelShape = UserCredentialsShape & {
    profile?: Omit<ProfileModel, 'id'>;
    reviews?: Review[];
};

type UserWithProfileShape = UserModelShape & {
    profile: Omit<ProfileModel, 'id'>;
};

// Los tipos que realmente exportaremos,
// que se infieren desde los schemas de validación de Zod,
// se comprueban con los tipos de Prisma para garantizar
// que los shapes definidos coinciden exactamente con los tipos de prisma

// User checks de los Models

type _FullUserCredentials = Assert<IsExact<FullUserCredentials, UserModel>>;

type _UserCheck = Assert<IsExact<User, UserModelShape>>;

type _UserCredentialsCheck = Assert<
    IsExact<UserCredentials, UserCredentialsShape>
>;

type _UserWithProfile = Assert<IsExact<UserWithProfile, UserWithProfileShape>>;

// UserDTOs Shapes

type LoginUserShape = Pick<UserCreateInput, 'email' | 'password'>;

type RegisterUserShape = Pick<UserCreateInput, 'email' | 'password'> & {
    role?: UserCreateInput['role'];
    profile: ProfileCreateWithoutUserInput;
};

interface UserUpdateShape {
    email?: UserCreateInput['email'];
    password?: UserCreateInput['password'];
    role?: UserCreateInput['role'];
    // profile?: OptionalsUndefined<ProfileCreateWithoutUserInput> | undefined;
}

// User checks de los DTOs

type _RegisterUserDTOCheck = Assert<
    IsExact<RegisterUserDTO, RegisterUserShape>
>;

type _LoginUserDTOCheck = Assert<IsExact<LoginUserDTO, LoginUserShape>>;

type _UserUpdateDTOCheck = Assert<IsExact<UserUpdateDTO, UserUpdateShape>>;
