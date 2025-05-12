import { FastifyReply, FastifyRequest } from 'fastify';
import { pipeline } from 'node:stream/promises';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import z from 'zod';
import { extractAudioQueue } from '../../../queues';
import { BASE_MEDIA_PATH } from '../../../constants/base-media-path';

interface SendVideoFields {
  videoFilePath: string;
  videoExtension: string;
  audioFilePath: string;
  audioExtension: string;
  webhookUrl: string;
}

export const sendVideoSchema = z.object({
  videoId: z.string(),
  videoUrl: z.string().url(),
  videoExtension: z.string(),
  audioId: z.string(),
  audioUrl: z.string().url(),
  audioExtension: z.string(),
});

export type SendVideoRequestBody = z.infer<typeof sendVideoSchema>;

export async function sendVideo(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body || {};
  const parts = request.parts();

  await mkdir(BASE_MEDIA_PATH, { recursive: true });

  if (Object.keys(body).length !== 0) {
    const bodyParsed = sendVideoSchema.safeParse(body);

    if (!bodyParsed?.success) {
      const formattedErrors = bodyParsed?.error?.errors?.map((error) => ({
        path: error?.path.join('.'),
        message: error?.message,
      }));

      return reply.status(400).send({ message: formattedErrors });
    }

    const job = await extractAudioQueue.add('process', {
      fileData: {
        localFile: null,
        remoteFile: {
          videoId: bodyParsed?.data?.videoId,
          videoUrl: bodyParsed?.data?.videoUrl,
          videoExtension: bodyParsed?.data?.videoExtension,
          audioId: bodyParsed?.data?.audioId,
          audioUrl: bodyParsed?.data?.audioUrl,
          audioExtension: bodyParsed?.data?.audioExtension,
        },
      },
    });

    return reply.send({
      message: '✅ The video has been queued for processing',
      jobId: job.id,
    });
  }

  const fields = {} as SendVideoFields;

  const videoFileId = uuidv4();
  const audioFileId = uuidv4();

  for await (const part of parts) {
    if (part?.type === 'file') {
      if (part?.fieldname === 'videoFile') {
        const filePath = path.join(
          BASE_MEDIA_PATH,
          `${videoFileId}${path.extname(part?.filename)}`
        );

        await pipeline(part?.file, createWriteStream(filePath));

        fields.videoFilePath = filePath;
        fields.videoExtension = path.extname(part?.filename);
      }

      if (part?.fieldname === 'audioFile') {
        const filePath = path.join(
          BASE_MEDIA_PATH,
          `${audioFileId}${path.extname(part?.filename)}`
        );

        await pipeline(part?.file, createWriteStream(filePath));

        fields.audioFilePath = filePath;
        fields.audioExtension = path.extname(part?.filename);
      }
    }

    if (part?.type === 'field') {
      if (part?.fieldname === 'webhookUrl') {
        fields.webhookUrl = part.fields?.webhookUrl?.value;
      }
    }
  }

  if (!fields.videoFilePath || !fields?.audioFilePath || !fields.webhookUrl) {
    return reply
      .code(400)
      .send({ message: 'videoFile, audioFile and webhookUrl is required.' });
  }

  const job = await extractAudioQueue.add('process', {
    fileData: {
      localFile: {
        videoId: videoFileId,
        audioId: audioFileId,
        videoExtension: fields.videoExtension,
      },
      remoteFile: null,
    },
  });

  return reply.send({
    message: '✅ The video has been queued for processing',
    jobId: job.id,
  });
}
