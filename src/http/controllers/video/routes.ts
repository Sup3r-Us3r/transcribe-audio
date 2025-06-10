import { FastifyInstance } from 'fastify';
import { sendVideo } from './send';

export async function videoRoutes(app: FastifyInstance) {
  app.post('/video/process', sendVideo);
}
