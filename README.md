# 🎙️ Video Transcription

This project is a backend service built with **Node.js**, **TypeScript**, **Fastify**, **FFmpeg**, **Whisper.cpp**, **BullMQ**, and **Redis** to handle video/audio uploads and generate transcriptions using OpenAI's Whisper model. The service also compresses and reformats videos for social media (Instagram format), extracts audio, generates subtitles, and uploads the results to Cloudinary.

---

## 🚀 Technologies

- **Node.js** + **TypeScript** for the application logic
- **Fastify** for HTTP API
- **FFmpeg** for video/audio processing
- **Whisper.cpp** (C++ Whisper port) for transcription
- **BullMQ** + **Redis** for job queue management
- **Cloudinary** for file storage
- **N8N** (via webhook) to render the final video with subtitles using Remotion

---

## 📦 Installation

```bash
# Clone the repository
$ git clone https://github.com/Sup3r-Us3r/transcribe-audio.git

# Navigate into the directory
$ cd transcribe-audio

# Install dependencies
$ npm install

# Install Whisper and download model
| Model     | Disk   | RAM     |
| --------- | ------ | ------- |
| tiny      | 75 MB  | ~390 MB |
| tiny.en   | 75 MB  | ~390 MB |
| base      | 142 MB | ~500 MB |
| base.en   | 142 MB | ~500 MB |
| small     | 466 MB | ~1.0 GB |
| small.en  | 466 MB | ~1.0 GB |
| medium    | 1.5 GB | ~2.6 GB |
| medium.en | 1.5 GB | ~2.6 GB |
| large-v1  | 2.9 GB | ~4.7 GB |
| large     | 2.9 GB | ~4.7 GB |
--------------------------------
$ npm run install-whisper

# Run in dev/watch mode
$ npm run dev
```

---

## 📁 .env Configuration

This project uses a `.env` file to securely store environment variables required for:

- Uploading files to **Cloudinary**
- Triggering a rendering workflow via **N8N Webhook**

```txt
CLOUDINARY_CLOUD_NAME=your-cloud-name;
CLOUDINARY_API_KEY=your-api- key;
CLOUDINARY_API_SECRET=your-api-secret;
WEBHOOK_URL=https://n8n.yourdomain.com/webhook/video-workflow
```

---

## 🛠️ Available Scripts

- `npm run dev`: Start the server in development mode with watch
- `npm run install-whisper`: Install Whisper.cpp and download the transcription model
- `npm run build`: Build the project for production

---

## 📤 API Usage

### POST `/video/process`

This endpoint supports both **JSON body** and **multipart/form-data** uploads for video/audio files.

### ✅ JSON Body Example

```json
{
  "videoId": "unique-video-id",
  "videoUrl": "https://example.com/video.mp4",
  "videoExtension": ".mp4",
  "audioId": "optional-audio-id",
  "audioUrl": "https://example.com/audio.mp3",
  "audioExtension": ".mp3",
  "videoDimensions": {
    "width": 1080,
    "height": 1920
  }
}
```

### ✅ Multipart Form Data

- `videoFile`: (File) — required
- `videoWidth`: (String) - required
- `videoHeight`: (String) - required
- `audioFile`: (File) — optional

If both video and audio files are uploaded, the provided audio will replace the original video audio.

---

## ⚙️ Job Pipeline

The backend executes a sequence of jobs to handle the entire video transcription process.

### 1. `compress-video-and-add-audio`

- Compress the video to reduce file size
- Crop the video to Instagram reels format (1080x1920)
- Replace original audio with the uploaded one (if provided)
- Uses `FFmpeg` for all operations

### 2. `extract-audio-from-video`

- Extract audio from the processed video
- Convert to `.wav` format with 1 channel and 16kHz (required by Whisper)
- Uses `FFmpeg` for all operations

### 3. `generate-subtitles`

- Transcribe the audio using `Whisper` with the `medium` model
- Generates a `.json` file with word-level subtitle timing

### 4. `upload-files`

- Uploads the compressed video and subtitle JSON to Cloudinary
- Remove local files after upload
- Triggers an N8N webhook to render the final video with subtitles using **Remotion**

---

## 📦 Outputs

After processing, the following files are available on Cloudinary:

- Compressed video (Instagram format)
- Subtitle JSON file

---

## 📫 Webhook Integration

A webhook is triggered to N8N after upload, which runs a rendering workflow with **Remotion** to produce the final video with subtitles embedded.
