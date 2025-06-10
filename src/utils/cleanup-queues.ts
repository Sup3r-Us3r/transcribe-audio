import {
  compressVideoAndAddAudioQueue,
  extractAudioQueue,
  generateSubtitlesQueue,
  addSubtitlesQueue,
  uploadFilesQueue,
  connection,
} from '../queues';
import { JobContextStore } from '../context/job-context-store';
import { JOBS } from '../constants/jobs';

export async function cleanupQueuesAndContext() {
  await Promise.all([
    compressVideoAndAddAudioQueue.obliterate({ force: true }),
    extractAudioQueue.obliterate({ force: true }),
    generateSubtitlesQueue.obliterate({ force: true }),
    addSubtitlesQueue.obliterate({ force: true }),
    uploadFilesQueue.obliterate({ force: true }),
  ]);

  await JobContextStore.clearMany([
    JOBS.COMPRESS_VIDEO_AND_ADD_AUDIO_JOB,
    JOBS.EXTRACT_AUDIO_JOB,
    JOBS.GENERATE_SUBTITLES_JOB,
    JOBS.ADD_SUBTITLES_JOB,
  ]);
}

export async function closeRedisConnection() {
  await connection.quit();
}
