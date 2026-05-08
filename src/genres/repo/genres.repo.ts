import type { AppPrismaClient } from '../../config/db-config.ts';
import type { Genre,  GenreDetail } from '../entities/genre.entity.ts';
import type { GenreCreateDTO } from '../entities/genre.dto.ts';
import { env } from '../../config/env.ts';
import debug from 'debug';

const log = debug(`${env.PROJECT_NAME}:repo:genres`);
log('Loading genres repo...');

export class GenresRepo {
    #prisma: AppPrismaClient;
    constructor(prisma: AppPrismaClient) {
        this.#prisma = prisma;
    }

    async getAllGenres(): Promise<Genre[]> {
        log('Getting all genres');
        return await this.#prisma.genre.findMany();
    }

    async getGenreByID(id: number): Promise<GenreDetail> {
        log('Getting genre with id %s', id);
        return await this.#prisma.genre.findUniqueOrThrow({
            where: {
                id,
            },
            include: {
                films: {
                    include: {
                        genres: {
                            omit: {
                                id: true,
                            }
                        }
                    }
                }
            }
        });
    }

    async createGenre(name: GenreCreateDTO['name']): Promise<Genre> {
        log('Creating genre with name %s', name);
        return await this.#prisma.genre.create({
            data: {
                name,
            },
        }); 
    }

    async updateGenre(id: number, name: GenreCreateDTO['name']): Promise<Genre> {
        log('Updating genre with id %s', id);
        return await this.#prisma.genre.update({
            where: {
                id,
            },
            data: {
                name,
            },
        });
    }

    async deleteGenre(id: number): Promise<Genre> {
        log('Deleting genre with id %s', id);
        return await this.#prisma.genre.delete({
            where: {
                id,
            },
        });
    }
}
