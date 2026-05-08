import type { UsersController } from '../controllers/users.controller.ts';
import type { AuthInterceptor } from '../../middleware/auth.interceptor.ts';
import { Router } from 'express';
import { env } from '../../config/env.ts';
import debug from 'debug';
import { validateBody, validateParams } from '../../middleware/validations.ts';
import {
    RegisterUserDTOSchema,
    UserCredentialsDTOSchema,
    UpdateUserDTOSchema,
} from '../entities/user.dto.ts';

const log = debug(`${env.PROJECT_NAME}:router:users`);
log('Loading users router...');

export class UsersRouter {
    #controller: UsersController;
    #router: Router;
    #authInterceptor: AuthInterceptor;
    constructor(controller: UsersController, authInterceptor: AuthInterceptor) {
        log('Initializing users router...');
        this.#controller = controller;
        this.#router = Router();
        this.#authInterceptor = authInterceptor;

        // Define routes and bind them to controller methods
        // For example:
        this.#router.post(
            '/register',
            validateBody(RegisterUserDTOSchema),
            this.#controller.register.bind(this.#controller),
        );
        this.#router.post(
            '/login',
            validateBody(UserCredentialsDTOSchema),
            this.#controller.login.bind(this.#controller),
        );
        this.#router.get(
            '/',
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.getAllUsers.bind(this.#controller),
        );
        this.#router.get(
            '/:id',
            validateParams(),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#controller.getUserById.bind(this.#controller),
        );
        this.#router.patch(
            '/:id',
            validateParams(),
            validateBody(UpdateUserDTOSchema),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor.isOwnerOrAdmin.bind(this.#authInterceptor),
            this.#controller.updateUser.bind(this.#controller),
        );
        this.#router.delete(
            '/:id',
            validateParams(),
            this.#authInterceptor.authenticate.bind(this.#authInterceptor),
            this.#authInterceptor.isOwnerOrAdmin.bind(this.#authInterceptor),
            this.#controller.deleteUser.bind(this.#controller),
        );
    }

    get router() {
        return this.#router;
    }
}
