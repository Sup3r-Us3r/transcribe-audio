import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from '@remotion/install-whisper-cpp';
import { Job } from 'bullmq';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import {
  WHISPER_LANG,
  WHISPER_MODEL,
  WHISPER_PATH,
  WHISPER_VERSION,
} from '../constants/whisper';
import { fileExists } from '../utils/file-exists';
import { endLog, errorLog, startLog } from '../utils/job-log';

export interface GenerateSubtitlesJobData {
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

export async function generateSubtitlesJob(
  jobData: Job<GenerateSubtitlesJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'GENERATING SUBTITLES');

    await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
    await downloadWhisperModel({ folder: WHISPER_PATH, model: WHISPER_MODEL });

    const isLocalAudio = Boolean(jobData?.data?.fileData?.localFile);
    const isRemoteAudio = Boolean(jobData?.data?.fileData?.remoteFile);
    const localAudioPath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.localFile?.videoId}.wav`;
    const remoteAudioPath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileData?.remoteFile?.videoId}.wav`;

    const audioExists = jobData?.data?.fileData?.localFile
      ? await fileExists(localAudioPath)
      : await fileExists(remoteAudioPath);

    if ((isLocalAudio && audioExists) || (isRemoteAudio && audioExists)) {
      const inputAudioPath = isLocalAudio ? localAudioPath : remoteAudioPath;

      const whisperCppOutput = await transcribe({
        inputPath: inputAudioPath,
        model: WHISPER_MODEL,
        tokenLevelTimestamps: true,
        whisperPath: WHISPER_PATH,
        whisperCppVersion: WHISPER_VERSION,
        printOutput: false,
        translateToEnglish: false,
        language: WHISPER_LANG,
        splitOnWord: true,
      });

      const subtitlesPath = inputAudioPath.replace('wav', 'json');
      const { captions } = toCaptions({ whisperCppOutput });
      await pipeline(
        JSON.stringify(captions, null, 2),
        createWriteStream(subtitlesPath, { encoding: 'utf-8' })
      );

      endLog(jobData?.id!, 'GENERATED SUBTITLES');
    } else {
      errorLog(jobData?.id!, 'FILE NOT FOUND');
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
