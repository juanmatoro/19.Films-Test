import { env } from '../../config/env.ts';
import debug from 'debug';
import { AuthService } from '../../services/auth.ts';
import type { AppPrismaClient } from '../../config/db-config.ts';
import type {
    RegisterUserDTO,
    LoginUserDTO,
    UserUpdateDTO,
    ProfileUpdateDTO,
} from '../entities/user.dto.ts';
import type {
    FullUserCredentials,
    UserCredentials,
    UserWithProfile,
} from '../entities/user.entity.ts';
import type { LoginResult } from '../../types/login.ts';
import { Role } from '../../../generated/prisma/enums.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const log = debug(`${env.PROJECT_NAME}:repo:users`);
log('Loading users repo...');

export class UsersRepo {
    #prisma: AppPrismaClient;
    constructor(prisma: AppPrismaClient) {
        this.#prisma = prisma;
    }

    async register(userData: RegisterUserDTO): Promise<UserWithProfile> {
        log('Registering user with email %s', userData.email);
        const hashedPassword = await AuthService.hash(userData.password);
        const result = await this.#prisma.user.create({
            data: {
                email: userData.email,
                password: hashedPassword,
                role: Role.USER,
                profile: {
                    create: userData.profile,
                },
            },
            include: {
                profile: true,
            },
            // omit: {
            //     password: true,
            // },
        });

        return result as UserWithProfile;
    }

    // private createToken(user: User) {

    async login(userData: LoginUserDTO): Promise<LoginResult> {
        log('Logging in user with email %s', userData.email);

        const result: FullUserCredentials =
            await this.#prisma.user.findUniqueOrThrow({
                where: {
                    email: userData.email,
                },
                omit: {
                    password: false,
                },
            });

        const isValid = await AuthService.compare(
            userData.password, // desencriptada
            result.password, // encriptada
        );

        if (!isValid) {
            throw new PrismaClientKnownRequestError(
                'Invalid user or password',
                {
                    code: 'P2004',
                    clientVersion: '',
                },
            );
        }

        // create token
        const credentials: UserCredentials = {
            id: result.id,
            email: result.email,
            role: result.role,
        };
        const token = AuthService.generateToken(credentials);

        return {
            credentials: credentials,
            token,
        };
    }

    async getAllUsers(): Promise<UserWithProfile[]> {
        log('Getting all users');
        return this.#prisma.user.findMany({
            include: {
                profile: true,
            },
        }) as Promise<UserWithProfile[]>;
    }

    async getUserById(id: number): Promise<UserWithProfile> {
        log('Getting user with id %d', id);
        return this.#prisma.user.findUniqueOrThrow({
            where: {
                id,
            },
            include: {
                profile: true,
            },
        }) as Promise<UserWithProfile>;
    }

    async updateUser(
        id: number,
        data: UserUpdateDTO,
    ): Promise<UserWithProfile> {
        log('Updating user with id %d', id);
        return this.#prisma.user.update({
            where: {
                id,
            },
            data: {
                ...data,
                ...(data.password && {
                    password: await AuthService.hash(data.password),
                }),
            },
            include: {
                profile: true,
            },
        }) as Promise<UserWithProfile>;
    }

    async updateUserProfile(
        id: number,
        profileData: ProfileUpdateDTO,
    ): Promise<UserWithProfile> {
        log('Updating user profile with id %d', id);
        return this.#prisma.user.update({
            where: {
                id,
            },
            data: {
                profile: {
                    update: profileData,
                },
            },
            include: {
                profile: true,
            },
        }) as Promise<UserWithProfile>;
    }

    async deleteUser(id: number): Promise<UserCredentials> {
        log('Deleting user with id %d', id);
        return this.#prisma.user.delete({
            where: {
                id,
            },
        });
    }
}
