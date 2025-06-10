import { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import z from 'zod';
import { BASE_MEDIA_PATH } from '../../../constants/base-media-path';
import { compressVideoAndAddAudioQueue } from '../../../queues';

interface SendVideoFields {
  videoFilePath: string;
  videoExtension: string;
  videoDimensions: {
    width: number;
    height: number;
  };
  audioFilePath?: string;
  audioExtension?: string;
}

export const sendVideoSchema = z.object({
  videoId: z.string(),
  videoUrl: z.string().url(),
  videoExtension: z.string(),
  videoDimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  audioId: z.string().optional(),
  audioUrl: z.string().url().optional(),
  audioExtension: z.string().optional(),
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

    const job = await compressVideoAndAddAudioQueue.add('process', {
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
        videoDimensions: {
          width: bodyParsed?.data?.videoDimensions?.width,
          height: bodyParsed?.data?.videoDimensions?.height,
        },
      },
    });

    return reply.send({
      message: '✅ The video has been queued for processing',
      jobId: job.id,
    });
  }

  const fields = {
    videoFilePath: '',
    videoExtension: '',
    videoDimensions: {
      width: 0,
      height: 0,
    },
    audioFilePath: undefined,
    audioExtension: undefined,
  } as SendVideoFields;

  const videoFileId = randomUUID();
  const audioFileId = randomUUID();

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
      if (part?.fieldname === 'videoWidth') {
        fields.videoDimensions.width = Number(part?.value);
      }

      if (part?.fieldname === 'videoHeight') {
        fields.videoDimensions.height = Number(part?.value);
      }
    }
  }

  if (
    !fields.videoFilePath ||
    fields.videoDimensions.width === 0 ||
    fields.videoDimensions.height === 0
  ) {
    return reply
      .code(400)
      .send({ message: 'videoFile, videoWidth and videoHeight is required.' });
  }

  const job = await compressVideoAndAddAudioQueue.add('process', {
    fileData: {
      localFile: {
        videoId: videoFileId,
        audioId: fields.audioFilePath ? audioFileId : undefined,
        videoExtension: fields.videoExtension,
        audioExtension: fields.audioFilePath
          ? fields.audioExtension
          : undefined,
      },
      remoteFile: null,
      videoDimensions: {
        width: fields.videoDimensions.width,
        height: fields.videoDimensions.height,
      },
    },
  });

  return reply.send({
    message: '✅ The video has been queued for processing',
    jobId: job.id,
  });
}
