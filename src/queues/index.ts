import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUES } from '../constants/queues';
import { ExtractAudioFromVideoToWavJobData } from '../jobs/extract-audio-from-video-to-wav';
import { GenerateSubtitlesJobData } from '../jobs/generate-subtitles';
import { AddSubTitleToVideoJobData } from '../jobs/add-subtitles-to-video';

export const connection = new Redis({
  maxRetriesPerRequest: null,
});

export const extractAudioQueue = new Queue<ExtractAudioFromVideoToWavJobData>(
  QUEUES.EXTRACT_AUDIO_QUEUE,
  {
    connection,
  }
);

export const generateSubtitlesQueue = new Queue<GenerateSubtitlesJobData>(
  QUEUES.GENERATE_SUBTITLES_QUEUE,
  {
    connection,
  }
);

export const addSubtitlesQueue = new Queue<AddSubTitleToVideoJobData>(
  QUEUES.ADD_SUBTITLES_QUEUE,
  {
    connection,
  }
);
