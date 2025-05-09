import { Worker } from 'bullmq';
import { app } from './app';
import { connection } from './queues';
import { QUEUES } from './constants/queues';
import { extractAudioFromVideoToWavJob } from './jobs/extract-audio-from-video-to-wav';
import { generateSubtitlesJob } from './jobs/generate-subtitles';
import { addSubtitleToVideoJob } from './jobs/add-subtitles-to-video';

// Create workers to process video
new Worker(QUEUES.EXTRACT_AUDIO_QUEUE, extractAudioFromVideoToWavJob, {
  connection,
});
new Worker(QUEUES.GENERATE_SUBTITLES_QUEUE, generateSubtitlesJob, {
  connection,
});
new Worker(QUEUES.ADD_SUBTITLES_QUEUE, addSubtitleToVideoJob, {
  connection,
});

app.listen({ port: 3333 }, (error) => {
  if (error) {
    app.log.error(error);
    process.exit(1);
  }

  console.log('🚀 Server is running at http://localhost:3333');
});
