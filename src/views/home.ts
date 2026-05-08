/* eslint-disable @typescript-eslint/no-extraneous-class */
import { env } from '../config/env.ts';
import debug from 'debug';
import { readFile } from 'fs/promises';
import { marked } from 'marked';
import matter from 'gray-matter';

const log = debug(`${env.PROJECT_NAME}:home-view`);
log('Loading home view class...');

export class HomeView {
    static #getInfo = async () => {
        log('Getting home view info from readme.md...');
        const readme = await readFile('./readme.md', 'utf-8');
        const { data, content } = matter(readme);
        const htmlHomeMain = marked.parse(content);
        return { data, htmlHomeMain };
    };

    static #title = env.PROJECT_NAME || 'Home';
    static #htmlAPImain = /*html*/ `
        <h2>API Documentation</h2>
        <p>La documentación de la API se completara más adelante con Swagger</p>
    `;

    static render = async (isHome = true) => {
        const { data, htmlHomeMain } = await this.#getInfo();
        const html = isHome ? htmlHomeMain : this.#htmlAPImain;
        const template = /*html*/ `
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Inicio | ${this.#title}</title>
                <link rel="shortcut icon" href="./favicon.moose.svg" type="image/x-icon">
                <link rel="stylesheet" href="./styles.css">
            </head>
            <body>
                <header class="header">
                    <h1>${data.title}</h1>
                </header>
                <main>
                    <section>
                        ${html}
                    </section>
                </main>
                <footer class="footer">
                    <p>Curso Desarrollo Web</p>
                </footer>
            </body>
            </html>
            `;
        log('Rendering home view template...');
        return template;
    };
}
