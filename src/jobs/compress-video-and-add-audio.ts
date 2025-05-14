import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { JOBS } from '../constants/jobs';
import { JobContextStore } from '../context/job-context-store';
import { extractAudioQueue } from '../queues';
import { fileExists } from '../utils/file-exists';
import { endLog, errorLog, startLog } from '../utils/job-log';
import { runFfmpeg } from '../utils/run-ffmpeg';

export interface CompressVideoAndAddAudioJobData {
  fileData: {
    localFile: {
      videoId: string;
      audioId: string;
      videoExtension: string;
      audioExtension: string;
    } | null;
    remoteFile: {
      videoId: string;
      videoUrl: string;
      videoExtension: string;
      audioId: string;
      audioUrl: string;
      audioExtension: string;
    } | null;
  };
}

export async function CompressVideoAndAddAudioJob(
  jobData: Job<CompressVideoAndAddAudioJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'COMPRESSING VIDEO AND ADDING AUDIO');

    const isLocalFile = Boolean(jobData?.data?.fileData?.localFile);
    const isRemoteFile = Boolean(jobData?.data?.fileData?.remoteFile);
    const localVideoPath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.localFile?.videoId}${jobData?.data?.fileData?.localFile?.videoExtension}`;
    const localAudioPath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.localFile?.audioId}${jobData?.data?.fileData?.localFile?.audioExtension}`;
    const remoteVideoUrl = jobData?.data?.fileData?.remoteFile?.videoUrl;
    const remoteAudioUrl = jobData?.data?.fileData?.remoteFile?.audioUrl;

    const localVideoExists = isLocalFile
      ? await fileExists(localVideoPath)
      : null;

    if ((isLocalFile && localVideoExists) || isRemoteFile) {
      const outputVideoFile = `${BASE_MEDIA_PATH}/${randomUUID()}.mp4`;

      const ffmpegArgs: string[] = [
        '-y',
        '-i',
        isLocalFile ? localVideoPath : remoteVideoUrl!,
        '-i',
        isLocalFile ? localAudioPath : remoteAudioUrl!,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-filter:v',
        'crop=1080:1350',
        '-c:v',
        'libx265',
        '-preset',
        'medium',
        '-crf',
        '25',
        '-tag:v',
        'hvc1',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        // '-shortest',
        outputVideoFile,
      ];

      await runFfmpeg(ffmpegArgs);

      if (isLocalFile) {
        await Promise.all([unlink(localVideoPath), unlink(localAudioPath)]);
      }

      endLog(jobData?.id!, 'COMPRESSED VIDEO AND ADDED AUDIO');

      await Promise.all([
        JobContextStore.set(JOBS.COMPRESS_VIDEO_AND_ADD_AUDIO_JOB, {
          filePath: outputVideoFile,
          extensionFile: 'mp4',
        }),
        extractAudioQueue.add('process', {
          videoPath: outputVideoFile,
        }),
      ]);
    } else {
      errorLog(jobData?.id!, 'FILE NOT FOUND');
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
