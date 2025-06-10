import { Job } from 'bullmq';
import { UploadApiOptions } from 'cloudinary';
import { unlink } from 'node:fs/promises';
import { JOBS } from '../constants/jobs';
import { JobContextStore } from '../context/job-context-store';
import { cloudinary } from '../lib/cloudinary';
import { endLog, errorLog, startLog } from '../utils/job-log';

type MediaEntry = {
  filePath: string;
  extensionFile: 'mp4' | 'wav' | 'json';
};

type WebHookRequest = {
  videoUrl: string;
  subtitlesUrl: string;
};

export async function uploadFilesJob(jobData: Job): Promise<void> {
  try {
    startLog(jobData?.id!, 'SENDING FILES');

    const getAllFilePathsData = await JobContextStore.getMany<MediaEntry>([
      JOBS.COMPRESS_VIDEO_AND_ADD_AUDIO_JOB,
      JOBS.EXTRACT_AUDIO_JOB,
      JOBS.GENERATE_SUBTITLES_JOB,
    ]);

    const resourceTypes: Record<
      MediaEntry['extensionFile'],
      UploadApiOptions['resource_type']
    > = {
      mp4: 'video',
      wav: 'video',
      json: 'raw',
    };

    const uploads = getAllFilePathsData
      ?.filter((media) => media.extensionFile !== 'wav')
      ?.map((media) => {
        return cloudinary.uploader.upload(media?.filePath, {
          folder: 'bot/instagram/videos',
          use_filename: true,
          unique_filename: true,
          resource_type: resourceTypes[media?.extensionFile],
        });
      });

    const uploadResults = await Promise.all(uploads);

    const videoResult = uploadResults?.find(
      (upload) => upload.format === 'mp4'
    );
    const subtitlesResult = uploadResults?.find(
      (upload) => upload.resource_type === 'raw'
    );

    if (!videoResult || !subtitlesResult) {
      errorLog(jobData?.id!, 'UNABLE TO GET DATA FROM FILE');

      return;
    }

    endLog(jobData?.id!, 'FILES SENT SUCCESSFULLY');

    for (const media of getAllFilePathsData) {
      try {
        await unlink(media?.filePath);
        endLog(jobData?.id!, 'FILES REMOVED SUCCESSFULLY');
      } catch (unlinkError) {
        errorLog(
          jobData?.id!,
          `UNABLE TO DELETE FILE ${media?.filePath}: ${unlinkError}`
        );
      }
    }

    const webhookRequest: WebHookRequest = {
      videoUrl: videoResult?.secure_url,
      subtitlesUrl: subtitlesResult?.secure_url,
    };

    const response = await fetch(
      `${process.env.WEBHOOK_URL}?renderVideo=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookRequest),
      }
    );

    if (!response.ok) {
      errorLog(jobData?.id!, 'UNABLE TO CALL WEBHOOK');

      return;
    }

    endLog(jobData?.id!, 'WEBHOOK CALLED SUCCESSFULLY');
  } catch (error) {
    errorLog(jobData?.id!, JSON.stringify(error, null, 2));
  }
}
