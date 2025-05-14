import { Job } from 'bullmq';
import { UploadApiOptions } from 'cloudinary';
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
  audioUrl: string;
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

    const uploads = getAllFilePathsData?.map((media) => {
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
    const audioResult = uploadResults?.find(
      (upload) => upload.format === 'wav'
    );
    const subtitlesResult = uploadResults?.find(
      (upload) => upload.resource_type === 'raw'
    );
    if (!videoResult || !audioResult || !subtitlesResult) {
      errorLog(jobData?.id!, 'UNABLE TO GET DATA FROM FILE');

      return;
    }

    const webhookRequest: WebHookRequest = {
      videoUrl: videoResult?.secure_url,
      audioUrl: audioResult?.secure_url,
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

    endLog(jobData?.id!, 'FILES SENT SUCCESSFULLY');
    endLog(jobData?.id!, 'WEBHOOK CALLED SUCCESSFULLY');
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
