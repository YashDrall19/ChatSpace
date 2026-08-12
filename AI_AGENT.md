# Local AI chat review

ChatSpace uses a fully local, free stack:

- [Ollama](https://ollama.com) runs the language and vision models.
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) transcribes voice notes and video audio.
- FFmpeg extracts audio and a few representative video frames.

On macOS, install the free runtimes:

```sh
brew install ollama ffmpeg whisper-cpp
```

Then start Ollama and download the production model:

```sh
ollama serve
ollama pull qwen3-vl:4b
```

Make `ffmpeg` and Whisper.cpp's `whisper-cli` available on `PATH`. Download a Whisper.cpp GGML model and set its location before starting the app:

```sh
export WHISPER_MODEL_PATH=/absolute/path/to/ggml-base.bin
npm run dev
```

For macOS, this downloads the recommended multilingual speech model (including Hindi and mixed Hindi-English) into the project:

```sh
mkdir -p models
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/ggml-base.bin
export WHISPER_MODEL_PATH="$PWD/models/ggml-base.bin"
```

For higher transcription accuracy in a production deployment, use Whisper's larger multilingual `small` model instead:

```sh
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o models/ggml-small.bin
export WHISPER_MODEL_PATH="$PWD/models/ggml-small.bin"
```

Optional variables: `OLLAMA_URL`, `OLLAMA_TEXT_MODEL`, `OLLAMA_VISION_MODEL`, `FFMPEG_BIN`, and `WHISPER_BIN`. Defaults are `http://127.0.0.1:11434`, `qwen3-vl:4b` for both text and vision, `ffmpeg`, and `whisper-cli`.

Copy `.env.example` to `.env.local` and set persistent absolute paths before production use. If you need a smaller development model, use Qwen2.5-VL 3B instead:

```sh
ollama pull qwen2.5vl:3b
```

Then set both `OLLAMA_TEXT_MODEL` and `OLLAMA_VISION_MODEL` to `qwen2.5vl:3b`.

Open **AI chat review** using the robot icon in the chat header. Each review considers the most recent 100 messages and up to 20 media items. Text, images, voice notes, audio files, and videos are analyzed independently. Every task/reminder must have a verbatim source quote that the app verifies before displaying it; a deterministic English/Hindi/Roman-Hindi fallback preserves explicit commitments if the model misses them. The quote is displayed below the task so users can audit each result. Analyses are cached in MySQL and reused until the message changes, so the same media is not repeatedly processed. Media that cannot be processed is reported in the result rather than preventing the rest of the chat from being reviewed.

The review endpoint permits one running review per user at a time to prevent duplicate local-model jobs.

## Production deployment

This local AI workflow requires a long-running Node.js server with persistent disk access, Ollama, Whisper.cpp, and FFmpeg installed on the same machine (or an explicitly configured private Ollama host). It cannot run on Netlify/Vercel-style serverless hosting: those environments cannot access your local Ollama process, local uploads, or native Whisper/FFmpeg binaries.

For production, deploy the complete app on a VM, Mac mini, or other persistent server, provide MySQL and a persistent uploads volume, run `ollama serve` as a service, and set `WHISPER_MODEL_PATH` to the persistent Whisper model location. Keep all AI services private behind the app server; do not expose the Ollama port publicly.

Set a strong `JWT_SECRET` and explicit MySQL credentials from `.env.example`. The application rejects a production startup without `JWT_SECRET` or `MYSQL_PASSWORD`; its fallback values are for local development only.
