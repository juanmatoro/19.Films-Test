import { env } from '../../config/env.ts';
import debug from 'debug';
import type { UsersRepo } from '../repos/users.repo.ts';
import type { NextFunction, Request, Response } from 'express';
import type {
    RegisterUserDTO,
    LoginUserDTO,
    UserUpdateDTO,
    ProfileCreateDTO,
} from '../entities/user.dto.ts';
import type { User } from '../entities/user.entity.ts';
import type { LoginResult } from '../../types/login.ts';
import {
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
} from '../../errors/http-error.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

const log = debug(`${env.PROJECT_NAME}:controller:users`);
log('Loading users controller...');

export class UsersController {
    #repo: UsersRepo;
    constructor(repo: UsersRepo) {
        this.#repo = repo;
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            log('Registering new user...');
            const userData: RegisterUserDTO = req.body;
            // Validated previously with zod middleware
            const user: User = await this.#repo.register(userData);
            return res.status(201).json(user);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to register user',
                { cause: error },
            );
            log('Error registering user: %s', internalError.message);
            return next(internalError);
        }
    }
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            log('Logging in user...');
            const loginData: LoginUserDTO = req.body;
            // Validated previously with zod middleware
            const loginResult: LoginResult = await this.#repo.login(loginData);
            return res.json(loginResult);
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                const unauthorizedError = new UnauthorizedError(
                    'Invalid email or password',
                    { cause: error },
                );
                log('Error logging in user: %s', unauthorizedError.message);
                unauthorizedError.cause = error;
                return next(unauthorizedError);
            }
            const internalError = new InternalServerError(
                'Failed to login user',
                { cause: error },
            );
            log('Error logging in user: %s', internalError.message);
            return next(internalError);
        }
    }

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            log('Getting all users...');
            const users: User[] = await this.#repo.getAllUsers();
            return res.json(users);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to get all users',
                { cause: error },
            );
            log('Error getting all users: %s', internalError.message);
            return next(internalError);
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Get User %s', id);
            const user: User = await this.#repo.getUserById(id);
            return res.json(user);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to get user by id',
                { cause: error },
            );
            log('Error getting user by id: %s', internalError.message);
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError('User not found', {
                    cause: error,
                });
                return next(notFoundError);
            }

            internalError.cause = error;
            return next(internalError);
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Updating user with ID: %s', id);
            const userData: UserUpdateDTO = req.body;
            // Validated previously with zod middleware
            const user: User = await this.#repo.updateUser(id, userData);
            return res.json(user);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to update user',
                { cause: error },
            );
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'User for update not found',
                    { cause: error },
                );
                log('Error updating user: %s', notFoundError.message);
                return next(notFoundError);
            }

            log('Error updating user: %s', internalError.message);
            internalError.cause = error;
            internalError.message = 'Failed to update user';
            return next(internalError);
        }
    }

    async updateProfileUser(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            log('Updating user profile %s', id);
            // Validate previously with zod middleware
            const profileData: Partial<ProfileCreateDTO> = req.body; // Validate this data in a real application
            const user: User = await this.#repo.updateUserProfile(
                id,
                profileData,
            );
            return res.json(user);
        } catch (error) {
            const internalError = new InternalServerError(
                'Failed to update user profile',
                { cause: error },
            );
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'User for profile update not found',
                    { cause: error },
                );
                log('Error updating user profile: %s', notFoundError.message);
                return next(notFoundError);
            }

            log('Error updating user profile: %s', internalError.message);
            internalError.cause = error;
            internalError.message = 'Failed to update profile user';
            return next(internalError);
        }
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            // Validated previously with zod middleware
            log('Deleting user with ID: %O', id);
            await this.#repo.deleteUser(id);
            return res.status(204).end();
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                const notFoundError = new NotFoundError(
                    'User for delete not found',
                    { cause: error },
                );
                log('Error deleting user: %s', notFoundError.message);
                return next(notFoundError);
            }

            const internalError = new InternalServerError(
                'Failed to delete user',
                { cause: error },
            );
            log('Error deleting user: %s', internalError.message);
            return next(internalError);
        }
    }
}
