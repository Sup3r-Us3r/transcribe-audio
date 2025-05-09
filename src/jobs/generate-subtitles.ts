import { Job } from 'bullmq';
import whisper from 'whisper-node';
import { fileExists } from '../utils/file-exists';
import { endLog, errorLog, startLog } from '../utils/job-log';
import { addSubtitlesQueue } from '../queues';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';

export interface GenerateSubtitlesJobData {
  fileId: string;
  videoExtension: string;
}

export async function generateSubtitlesJob(
  jobData: Job<GenerateSubtitlesJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'GENERATING SUBTITLES');

    const audioExists = await fileExists(
      `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}.wav`
    );

    if (audioExists) {
      const options = {
        modelName: 'base',
        whisperOptions: {
          language: 'auto',
          gen_file_txt: false,
          gen_file_subtitle: true,
          gen_file_vtt: false,
          word_timestamps: false,
        },
      };

      await whisper(`${BASE_MEDIA_PATH}/${jobData?.data?.fileId}.wav`, options);

      endLog(jobData?.id!, 'GENERATED SUBTITLES');

      await addSubtitlesQueue.add('process', {
        fileId: jobData?.data?.fileId,
        inputVideoExtension: jobData?.data?.videoExtension,
      });
    } else {
      errorLog(
        jobData?.id!,
        `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}.wav FILE NOT FOUND`
      );
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
