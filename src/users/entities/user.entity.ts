// En OOP clásica la Entidad es una clase
// que representa un objeto del dominio,
// con sus propiedades y métodos asociados.
// En el contexto de una aplicación web con TypeScript,
// especialmente cuando se utiliza un ORM como Prisma,
// la Entidad suele ser una clase o interfaz que define la estructura
// de los datos tal como se reciben de la base de datos (via prisma)
// y se manipulan en la aplicación.

// Al utilizar Zod para validar los datos, podemos definir esquemas
// que representen tanto la estructura de los datos que recibimos de la base de datos (Model)
// como la estructura de los datos que aceptamos en las operaciones de la aplicación (DTO).

// Los valores <name>ModelSchema representan fielmente el modelo de prisma
// incluidos ids y campos derivados de las relaciones,
// Se mantiene los tipos con la mayor fidelidad (e.g. Date, Decimal)
// para garantizar compatibilidad con los tipos de prisma
// No se incluyen atributos ignorados en prisma,
// Se utilizan para validar los datos que obtenemos de la base de datos
// y para checks de compatibilidad

import { z } from 'zod';
import { ReviewModelSchema } from '../../reviews/entities/review.entity.ts';

export const ProfileModelSchema = z.object({
    firstName: z.string(),
    surname: z.string(),
    avatar: z.string(),
});

export const UserModelSchema = z.object({
    id: z.number(),
    email: z.string(),
    role: z.enum(['ADMIN', 'EDITOR', 'USER']),
    profile: ProfileModelSchema.optional(),
    reviews: z.array(ReviewModelSchema).optional(),

}); 

export const UserCredentialsModelSchema  = UserModelSchema.pick({
    id: true,
    email: true,
    role: true,
});

export const UserCredentialsFullModelSchema = UserCredentialsModelSchema.extend({
    password: z.string(),
});

export const UserModelWithProfile = UserModelSchema.extend({
    profile: ProfileModelSchema
});

export type Profile = z.infer<typeof ProfileModelSchema>;
export type UserCredentials = z.infer<typeof UserCredentialsModelSchema>;
export type FullUserCredentials =  z.infer<typeof UserCredentialsFullModelSchema>;
export type User =  z.infer<typeof UserModelSchema>;
export type UserWithProfile = z.infer<typeof UserModelWithProfile>;
