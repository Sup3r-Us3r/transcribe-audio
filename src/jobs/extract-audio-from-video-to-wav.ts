import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { JOBS } from '../constants/jobs';
import { JobContextStore } from '../context/job-context-store';
import { generateSubtitlesQueue } from '../queues';
import { fileExists } from '../utils/file-exists';
import { endLog, errorLog, startLog } from '../utils/job-log';
import { runFfmpeg } from '../utils/run-ffmpeg';

export interface ExtractAudioFromVideoToWavJobData {
  videoPath: string;
}

export async function extractAudioFromVideoToWavJob(
  jobData: Job<ExtractAudioFromVideoToWavJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'EXTRACTING AUDIO FROM VIDEO');

    const localVideoExists = await fileExists(jobData?.data?.videoPath);

    if (localVideoExists) {
      const outputAudioFile = `${BASE_MEDIA_PATH}/${randomUUID()}.wav`;

      const ffmpegArgs: string[] = [
        '-y',
        '-i',
        jobData?.data?.videoPath,
        '-vn', // Remove video
        '-acodec',
        'pcm_s16le', // PCM Linear signed 16-bit little-endian
        '-ar',
        '16000', // 16 kHz
        '-ac',
        '1', // Mono
        outputAudioFile,
      ];

      await runFfmpeg(ffmpegArgs);

      endLog(jobData?.id!, 'AUDIO EXTRACTED AND CONVERTED TO .WAV');

      await Promise.all([
        JobContextStore.set(JOBS.EXTRACT_AUDIO_JOB, {
          filePath: outputAudioFile,
          extensionFile: 'wav',
        }),
        generateSubtitlesQueue.add('process', {
          audioPath: outputAudioFile,
        }),
      ]);
    } else {
      errorLog(jobData?.id!, 'FILE NOT FOUND');
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
