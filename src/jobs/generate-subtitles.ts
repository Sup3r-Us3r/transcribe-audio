import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from '@remotion/install-whisper-cpp';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { JOBS } from '../constants/jobs';
import {
  WHISPER_LANG,
  WHISPER_MODEL,
  WHISPER_PATH,
  WHISPER_VERSION,
} from '../constants/whisper';
import { JobContextStore } from '../context/job-context-store';
import { fileExists } from '../utils/file-exists';
import { endLog, errorLog, startLog } from '../utils/job-log';

export interface GenerateSubtitlesJobData {
  audioPath: string;
}

export async function generateSubtitlesJob(
  jobData: Job<GenerateSubtitlesJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'GENERATING SUBTITLES');

    await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
    await downloadWhisperModel({ folder: WHISPER_PATH, model: WHISPER_MODEL });

    const audioExists = await fileExists(jobData?.data?.audioPath);

    if (audioExists) {
      const inputAudioPath = jobData?.data?.audioPath;

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

      const subtitlesPath = `${BASE_MEDIA_PATH}/${randomUUID()}.json`;
      const { captions } = toCaptions({ whisperCppOutput });
      await pipeline(
        JSON.stringify(captions, null, 2),
        createWriteStream(subtitlesPath, { encoding: 'utf-8' })
      );

      endLog(jobData?.id!, 'GENERATED SUBTITLES');

      await JobContextStore.set(JOBS.GENERATE_SUBTITLES_JOB, {
        subtitlesPath,
      });
    } else {
      errorLog(jobData?.id!, 'FILE NOT FOUND');
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
