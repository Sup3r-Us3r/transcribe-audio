import { Job } from 'bullmq';
import { runFfmpeg } from '../utils/run-ffmpeg';
import { endLog, errorLog, startLog } from '../utils/job-log';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { fileExists } from '../utils/file-exists';
import { generateSubtitlesQueue } from '../queues';

export interface ExtractAudioFromVideoToWavJobData {
  fileId: string;
  videoExtension: string;
}

export async function extractAudioFromVideoToWavJob(
  jobData: Job<ExtractAudioFromVideoToWavJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'EXTRACTING AUDIO FROM VIDEO');

    const videoExists = await fileExists(
      `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}${jobData?.data?.videoExtension}`
    );

    if (videoExists) {
      const ffmpegArgs: string[] = [
        '-y',
        '-i',
        `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}${jobData?.data?.videoExtension}`,
        '-vn', // Remove video
        '-acodec',
        'pcm_s16le', // PCM Linear signed 16-bit little-endian
        '-ar',
        '16000', // 16 kHz
        '-ac',
        '1', // Mono
        `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}.wav`,
      ];

      await runFfmpeg(ffmpegArgs);

      endLog(jobData?.id!, 'AUDIO EXTRACTED AND CONVERTED TO .WAV');

      await generateSubtitlesQueue.add('process', {
        fileId: jobData?.data?.fileId,
        videoExtension: jobData?.data?.videoExtension,
      });
    } else {
      errorLog(
        jobData?.id!,
        `${jobData?.data?.fileId}.${jobData?.data?.videoExtension} FILE NOT FOUND`
      );
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
