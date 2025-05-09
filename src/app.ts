import fastify from 'fastify';

import { fastifyMultipart } from '@fastify/multipart';
import { videoRoutes } from './http/controllers/video/routes';

const app = fastify({ logger: true });

app.register(fastifyMultipart);
app.register(videoRoutes);

export { app };
