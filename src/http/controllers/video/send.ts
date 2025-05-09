import { FastifyReply, FastifyRequest } from 'fastify';
import { pipeline } from 'node:stream/promises';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { extractAudioQueue } from '../../../queues';
import { BASE_MEDIA_PATH } from '../../../constants/base-media-path';

interface SendVideoFields {
  videoFilePath: string;
  videoExtension: string;
  webhookUrl: string;
}

export async function sendVideo(request: FastifyRequest, reply: FastifyReply) {
  const parts = request.parts();

  await mkdir(BASE_MEDIA_PATH, { recursive: true });

  const fields = {} as SendVideoFields;

  const fileId = uuidv4();

  for await (const part of parts) {
    if (part?.type === 'file') {
      const filePath = path.join(
        BASE_MEDIA_PATH,
        `${fileId}${path.extname(part?.filename)}`
      );

      await pipeline(part?.file, createWriteStream(filePath));

      if (part?.fieldname === 'videoFile') {
        fields.videoFilePath = filePath;
        fields.videoExtension = path.extname(part?.filename);
      }
    }

    if (part?.type === 'field') {
      if (part?.fieldname === 'webhookUrl') {
        fields.webhookUrl = part.fields?.webhookUrl?.value;
      }
    }
  }

  if (!fields.videoFilePath || !fields.webhookUrl) {
    return reply
      .code(400)
      .send({ message: 'videoFile and webhookUrl is required.' });
  }

  const job = await extractAudioQueue.add('process', {
    fileId,
    videoExtension: fields.videoExtension,
  });

  return reply.send({
    message: '✅ The video has been queued for processing',
    jobId: job.id,
  });
}
