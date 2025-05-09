import { Job } from 'bullmq';
import { runFfmpeg } from '../utils/run-ffmpeg';
import { fileExists } from '../utils/file-exists';
import { BASE_MEDIA_PATH } from '../constants/base-media-path';
import { endLog, errorLog, startLog } from '../utils/job-log';

export interface AddSubTitleToVideoJobData {
  fileId: string;
  inputVideoExtension: string;
  options?: {
    videoWidth: number;
    videoHeight: number;
  };
}

export async function addSubtitleToVideoJob(
  jobData: Job<AddSubTitleToVideoJobData>
): Promise<void> {
  try {
    startLog(jobData?.id!, 'ADDING SUBTITLES TO VIDEO');

    const srtFilePath = `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}.wav.srt`;
    const srtExists = await fileExists(srtFilePath);

    if (srtExists) {
      const subtitleFilter = `subtitles=${srtFilePath}:force_style='FontName=Arial,FontSize=20,Outline=1,Shadow=1,Alignment=2'`;
      let combinedFilter = `${subtitleFilter}`;

      if (
        jobData?.data?.options?.videoWidth &&
        jobData?.data?.options?.videoHeight
      ) {
        const scaleFilter = `scale=${jobData?.data?.options?.videoWidth}:${jobData?.data?.options?.videoHeight}`;
        combinedFilter = combinedFilter.concat(`,${scaleFilter}`);
      }

      const ffmpegArgs: string[] = [
        '-y',
        '-i',
        `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}${jobData?.data?.inputVideoExtension}`,
        '-vf',
        combinedFilter,
        '-c:a',
        'copy',
        `${BASE_MEDIA_PATH}/${jobData?.data?.fileId}-new.mp4`,
      ];

      await runFfmpeg(ffmpegArgs);

      endLog(jobData?.id!, 'SUBTITLES ADDED TO VIDEO');
    } else {
      errorLog(jobData?.id!, `${srtFilePath} FILE NOT FOUND`);
    }
  } catch (error) {
    errorLog(jobData?.id!, error as any);
  }
}
