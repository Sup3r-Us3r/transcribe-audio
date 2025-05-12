import fastify from 'fastify';

import { fastifyMultipart } from '@fastify/multipart';
import { videoRoutes } from './http/controllers/video/routes';

const app = fastify({ logger: true });

app.register(fastifyMultipart, {
  limits: {
    fileSize: 800 * 1024 * 1024, // 800MB
  },
});
app.register(videoRoutes);

export { app };
