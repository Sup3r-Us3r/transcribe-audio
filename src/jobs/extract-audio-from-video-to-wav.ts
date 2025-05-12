import { Job } from 'bullmq';
import { runFfmpeg } from '../utils/run-ffmpeg';
import { endLog, errorLog, startLog } from '../utils/job-log';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { fileExists } from '../utils/file-exists';
import { generateSubtitlesQueue } from '../queues';

export interface ExtractAudioFromVideoToWavJobData {
  fileData: {
    localFile: {
      videoId: string;
      audioId: string;
      videoExtension: string;
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

export async function extractAudioFromVideoToWavJob(
  jobData: Job<ExtractAudioFromVideoToWavJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'EXTRACTING AUDIO FROM VIDEO');

    const isLocalVideo = Boolean(jobData?.data?.fileData?.localFile);
    const isRemoteVideo = Boolean(jobData?.data?.fileData?.remoteFile);
    const localVideoPath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.localFile?.videoId}${jobData?.data?.fileData?.localFile?.videoExtension}`;
    const remoteVideoUrl = jobData?.data?.fileData?.remoteFile?.videoUrl;

    const localVideoExists = jobData?.data?.fileData?.localFile
      ? await fileExists(localVideoPath)
      : null;

    if ((isLocalVideo && localVideoExists) || isRemoteVideo) {
      const outputAudioFile = isLocalVideo
        ? `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.localFile?.videoId}.wav`
        : `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.remoteFile?.videoId}.wav`;

      const ffmpegArgs: string[] = [
        '-y',
        '-i',
        isLocalVideo ? localVideoPath : remoteVideoUrl!,
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

      await generateSubtitlesQueue.add('process', {
        fileData: jobData?.data?.fileData,
      });
    } else {
      errorLog(jobData?.id!, 'FILE NOT FOUND');
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
