import { Worker } from 'bullmq';
import { app } from './app';
import { QUEUES } from './constants/queues';
import { compressVideoAndAddAudioJob } from './jobs/compress-video-and-add-audio';
import { extractAudioFromVideoToWavJob } from './jobs/extract-audio-from-video-to-wav';
import { generateSubtitlesJob } from './jobs/generate-subtitles';
import { uploadFilesJob } from './jobs/upload-files';
import { connection } from './queues';
import { cleanupQueuesAndContext } from './utils/cleanup-queues';

// Create workers to process video
new Worker(
  QUEUES.COMPRESS_VIDEO_AND_ADD_AUDIO_QUEUE,
  compressVideoAndAddAudioJob,
  {
    connection,
  }
);
new Worker(QUEUES.EXTRACT_AUDIO_QUEUE, extractAudioFromVideoToWavJob, {
  connection,
});
new Worker(QUEUES.GENERATE_SUBTITLES_QUEUE, generateSubtitlesJob, {
  connection,
});
new Worker(QUEUES.UPLOAD_FILES_QUEUE, uploadFilesJob, {
  connection,
});

cleanupQueuesAndContext();

app.listen({ port: 3333 }, (error) => {
  if (error) {
    app.log.error(error);
    process.exit(1);
  }

  console.log('🚀 Server is running at http://localhost:3333');
});
