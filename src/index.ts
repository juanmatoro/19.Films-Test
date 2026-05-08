import debug from 'debug';
import { env } from './config/env.ts';
import { startServer } from './server.ts';

const log = debug(`${env.PROJECT_NAME}:index`);

await startServer().catch((error) => {
    log('Error starting server:', error);
    process.exit(1);
});
