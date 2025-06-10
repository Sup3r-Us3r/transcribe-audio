import { spawn } from 'node:child_process';

export async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit'] });

    ffmpeg.on('error', (error) => reject(error));
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg finished with code ${code}`));
      }
    });
  });
}
