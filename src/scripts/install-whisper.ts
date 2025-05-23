import {
  downloadWhisperModel,
  installWhisperCpp,
} from '@remotion/install-whisper-cpp';
import {
  WHISPER_MODEL,
  WHISPER_PATH,
  WHISPER_VERSION,
} from '../constants/whisper';

async function main() {
  await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
  await downloadWhisperModel({ folder: WHISPER_PATH, model: WHISPER_MODEL });
}

main();
