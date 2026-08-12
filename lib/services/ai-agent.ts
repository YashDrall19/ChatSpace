import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import type { Message, MessageType } from '@/types';
import { getCachedAiMessageAnalysis, saveCachedAiMessageAnalysis } from '@/lib/services/ai-analysis-cache';

const execFileAsync = promisify(execFile);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
// Qwen3-VL 4B is the production default: it handles text, images, and OCR in a
// single local model while still fitting comfortably on modern consumer hardware.
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'qwen3-vl:4b';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:4b';
// Free Metal memory for Whisper after each model response. Set this to e.g.
// "5m" only on a machine with enough shared memory for both models.
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '0s';
const DEFAULT_WHISPER_MODEL = path.join(process.cwd(), 'models', 'ggml-base.bin');
const PREFERRED_WHISPER_MODEL = path.join(process.cwd(), 'models', 'ggml-small.bin');
// A partial curl download can exist after a network interruption. The GGML
// Small model is roughly 466 MB, so never select a clearly incomplete file.
const MIN_COMPLETE_SMALL_MODEL_BYTES = 400 * 1024 * 1024;
const PIPELINE_VERSION = `task-v9:${TEXT_MODEL}:${VISION_MODEL}`;

const MAX_REVIEW_MESSAGES = 100;
const MAX_REVIEW_MEDIA = 20;
const MAX_TEXT_PER_MESSAGE = 4_000;
const MAX_SUMMARY_CHARS = 48_000;
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45_000);
const MEDIA_COMMAND_TIMEOUT_MS = Number(process.env.MEDIA_COMMAND_TIMEOUT_MS || 90_000);

export interface AiReminder {
  task: string;
  due: string | null;
  source: string;
  evidence: string;
}

export interface AiReview {
  summary: string;
  highlights: string[];
  reminders: AiReminder[];
  analyzed: { text: number; images: number; audio: number; videos: number };
  warnings: string[];
}

interface ReviewSource {
  id: string;
  createdAt: number;
  type: MessageType;
  content: string;
}

interface ReminderCandidate {
  sourceId?: unknown;
  task?: unknown;
  due?: unknown;
  evidence?: unknown;
}

const SUMMARY_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: ['summary', 'highlights'],
  properties: {
    summary: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
};

const REMINDER_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: ['reminders'],
  properties: {
    reminders: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['sourceId', 'task', 'due', 'evidence'],
        properties: {
          sourceId: { type: 'string' },
          task: { type: 'string' },
          due: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          evidence: { type: 'string' },
        },
      },
    },
  },
};

function localUploadPath(fileUrl: string): string | null {
  if (!fileUrl.startsWith('/uploads/')) return null;
  const root = path.join(process.cwd(), 'public', 'uploads');
  const candidate = path.resolve(process.cwd(), 'public', `.${fileUrl}`);
  return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}

async function ollama(
  prompt: string,
  options: { images?: string[]; model?: string; schema?: Record<string, unknown> } = {},
): Promise<string> {
  let response: Response;
  const model = options.model || TEXT_MODEL;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: options.schema,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: { temperature: 0 },
        messages: [{ role: 'user', content: prompt, images: options.images }],
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Ollama did not respond within ${Math.round(OLLAMA_TIMEOUT_MS / 1000)} seconds. Ensure it is running and has enough free memory.`);
  }
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 404 && /model/i.test(detail)) {
      throw new Error(`Ollama model "${model}" is not installed. Run: ollama pull ${model}`);
    }
    throw new Error(`Ollama request failed (${response.status}).`);
  }
  const data = await response.json() as { message?: { content?: string } };
  return data.message?.content?.trim() || '';
}

function parseJson<T>(value: string): T | null {
  const possibleJson = value.replace(/```json|```/gi, '').trim().match(/\{[\s\S]*\}/)?.[0];
  if (!possibleJson) return null;
  try { return JSON.parse(possibleJson) as T; } catch { return null; }
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanEvidence(value: string): string {
  return value.replace(/^(?:Text message|Speech transcript|Image content|Visual content):\s*/gim, '').replace(/\s+/g, ' ').trim();
}

function isTrivialTestMessage(value: string): boolean {
  const text = normalized(cleanEvidence(value)).replace(/[.!]/g, '');
  return /^(?:enter )?(?:a )?(?:test|test message|testing|test reply|reply test|respond to (?:the )?message)$/.test(text);
}

/**
 * A conservative non-LLM safety net. It covers direct English, Hindi, and Roman
 * Hindi commitments when the local model fails to emit valid structured JSON.
 */
function hasTaskIntent(value: string): boolean {
  const text = normalized(cleanEvidence(value));
  if (!text || isTrivialTestMessage(text)) return false;
  const englishCommitment = /\b(?:i|we|you|he|she|they)\s+(?:will|shall|need to|have to|must|should|plan to|want to|am going to|are going to|is going to|intend to)\b/i.test(text);
  const englishTaskWords = /\b(?:remind(?:er)?|remember to|don't forget|appointment|meeting|deadline|due|follow[- ]?up|to-?do|task|schedule|scheduled|booking|booked)\b/i.test(text);
  const englishImperative = /^(?:please\s+)?(?:buy|call|send|submit|pay|collect|pick up|visit|attend|join|book|renew|prepare|complete|finish|check|email|message|go to|meet)\b/i.test(text);
  const hindiCommitment = /(?:मुझे|हमें|मुझको|हमको).{0,100}(?:करना है|जाना है|पहुंचना है|पहुँचना है|भेजना है|मिलना है|खरीदना है|याद रखना है)|(?:याद दिला(?:ना|दो)|रिमाइंड)|(?:(?:कल|आज|परसों).{0,100}(?:जाना है|पहुंचना है|पहुँचना है|करना है|भेजना है|मिलना है|खरीदना है|ऑफिस)|(?:जाना है|पहुंचना है|पहुँचना है|करना है|भेजना है|मिलना है|खरीदना है|ऑफिस).{0,100}(?:कल|आज|परसों))/u.test(text);
  const romanHindiCommitment = /\b(?:mujhe|humein|humko|mujhko).{0,100}\b(?:karna|jana|jaana|pahunchna|pohchna|pahunch|bhejna|milna|khareedna|kharidna|yaad)\b|(?:\b(?:kal|aaj|parso).{0,100}\b(?:karna|jana|jaana|pahunchna|pohchna|pahunch|bhejna|milna|khareedna|kharidna|office)\b|\b(?:karna|jana|jaana|pahunchna|pohchna|pahunch|bhejna|milna|khareedna|kharidna|office)\b.{0,100}\b(?:kal|aaj|parso)\b)|\b(?:yaad dila(?:na|dena)?|remind kar(?:na|dena)?)\b/i.test(text);
  return englishCommitment || englishTaskWords || englishImperative || hindiCommitment || romanHindiCommitment;
}

function couldContainTask(value: string): boolean {
  if (hasTaskIntent(value)) return true;
  // This broader gate is used only to decide whether a source merits a local
  // model call; model output still needs verbatim evidence before display.
  return /\b(?:buy|get|call|send|submit|pay|collect|pick up|visit|attend|join|book|renew|prepare|complete|finish|check|email|message|meet|go|travel|deliver|order|clean|study|work)\b/i.test(value)
    || /(?:करना|जाना|भेजना|मिलना|खरीदना|लेना|देना|पढ़ना|काम|ऑफिस|मीटिंग)/u.test(value)
    || /\b(?:karna|jana|jaana|bhejna|milna|khareedna|kharidna|lena|dena|padhna|office|meeting)\b/i.test(value)
    // Whisper can emit Urdu/Arabic script for Hindi. Send it to the semantic
    // extractor instead of silently discarding it because a Hindi regex missed.
    || /[\u0600-\u06FF]/u.test(value);
}

function explicitDueFromSource(value: string): string | null {
  const text = cleanEvidence(value);
  const patterns = [
    /\b(?:today|tomorrow|tonight|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday))(?:\s+(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)?\b/i,
    /\b(?:on\s+)?(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))(?:\s+(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)?\b/i,
    /\b(?:on\s+)?(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s+(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)?\b/i,
    /\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i,
    /\b\d{1,2}\s*baje\b(?:\s*(?:aaj|kal|parso))?/i,
    /(?:आज|कल|परसों)(?:\s+(?:सुबह|शाम|रात|दोपहर))?(?:\s*\d{1,2}\s*बजे)?/u,
    /(?:सुबह|शाम|रात|दोपहर)\s*\d{1,2}\s*बजे/u,
  ];
  return patterns.map((pattern) => text.match(pattern)?.[0] || null).find(Boolean) || null;
}

function sourceEvidenceSegments(source: ReviewSource): string[] {
  const text = cleanEvidence(source.content);
  return text
    .split(/(?<=[.!?।])\s+|\n+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function deterministicReminders(source: ReviewSource): AiReminder[] {
  if (source.type === 'image' || isTrivialTestMessage(source.content)) return [];
  return sourceEvidenceSegments(source)
    .filter((evidence) => hasTaskIntent(evidence))
    .map((evidence) => ({ task: evidence, due: explicitDueFromSource(evidence), source: `Message #${source.id}`, evidence }));
}

function dueIsGrounded(due: string, sourceContent: string): boolean {
  const dueText = normalized(due);
  const sourceText = normalized(cleanEvidence(sourceContent));
  return Boolean(dueText) && dueText.length <= 160 && sourceText.includes(dueText);
}

function modelReminders(candidates: ReminderCandidate[], source: ReviewSource): AiReminder[] {
  const reminders: AiReminder[] = [];
  for (const candidate of candidates) {
    if (candidate.sourceId !== source.id || typeof candidate.task !== 'string' || typeof candidate.evidence !== 'string') continue;
    const task = candidate.task.replace(/\s+/g, ' ').trim();
    const evidence = candidate.evidence.replace(/\s+/g, ' ').trim();
    const sourceContent = normalized(cleanEvidence(source.content));
    if (!task || !evidence || task.length > 240 || evidence.length > 600 || isTrivialTestMessage(evidence)) continue;
    // The model is the semantic decision-maker for scripts/languages outside
    // our deterministic fallback. The evidence must still be verbatim from the
    // source, which prevents it from inventing a task.
    if (!sourceContent.includes(normalized(evidence))) continue;
    const due = typeof candidate.due === 'string' && dueIsGrounded(candidate.due, source.content) ? candidate.due.trim() : explicitDueFromSource(evidence);
    reminders.push({ task, due, source: `Message #${source.id}`, evidence });
  }
  return reminders;
}

function dedupeReminders(reminders: AiReminder[]): AiReminder[] {
  return reminders.filter((reminder, index, all) => all.findIndex((candidate) =>
    candidate.source === reminder.source && normalized(candidate.evidence) === normalized(reminder.evidence),
  ) === index);
}

async function transcribeAudio(input: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chatspace-ai-'));
  const wav = path.join(tempDir, 'audio.wav');
  const outputBase = path.join(tempDir, 'transcript');
  const preferredModelAvailable = await fs.stat(PREFERRED_WHISPER_MODEL)
    .then((details) => details.size >= MIN_COMPLETE_SMALL_MODEL_BYTES)
    .catch(() => false);
  const models = process.env.WHISPER_MODEL_PATH
    ? [process.env.WHISPER_MODEL_PATH]
    : [preferredModelAvailable ? PREFERRED_WHISPER_MODEL : null, DEFAULT_WHISPER_MODEL].filter((model): model is string => Boolean(model));
  try {
    try {
      await execFileAsync(process.env.FFMPEG_BIN || 'ffmpeg', ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', wav], { maxBuffer: 1024 * 1024, timeout: MEDIA_COMMAND_TIMEOUT_MS });
    } catch {
      throw new Error('FFmpeg could not decode this media. Install it with: brew install ffmpeg');
    }
    let lastError = 'Whisper.cpp could not transcribe this media.';
    for (const whisperModel of models) {
      try {
        await fs.access(whisperModel);
        const whisperArgs = ['-m', whisperModel, '-l', 'auto', '-f', wav, '-otxt', '-of', outputBase];
        try {
          await execFileAsync(process.env.WHISPER_BIN || 'whisper-cli', whisperArgs, { maxBuffer: 1024 * 1024, timeout: MEDIA_COMMAND_TIMEOUT_MS });
        } catch {
          // Ollama and Whisper can contend for Metal memory. Retry on CPU, then
          // move to the smaller fallback model if Small cannot run at all.
          await execFileAsync(process.env.WHISPER_BIN || 'whisper-cli', ['-ng', ...whisperArgs], { maxBuffer: 1024 * 1024, timeout: MEDIA_COMMAND_TIMEOUT_MS });
        }
        const transcript = (await fs.readFile(`${outputBase}.txt`, 'utf8')).trim();
        if (transcript) return transcript;
        lastError = `Whisper produced an empty transcript with ${path.basename(whisperModel)}.`;
      } catch {
        lastError = `Whisper could not run ${path.basename(whisperModel)}.`;
      }
    }
    throw new Error(`${lastError} Close other GPU-heavy apps and retry, or set WHISPER_MODEL_PATH to a working multilingual model.`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function analyzeImage(filePath: string): Promise<string> {
  const image = await fs.readFile(filePath);
  return ollama(
    'Transcribe all relevant visible English and Hindi text faithfully, then briefly describe only observable content. Preserve dates, times, task wording, and names exactly when visible. Do not invent facts or tasks.',
    { images: [image.toString('base64')], model: VISION_MODEL },
  );
}

async function analyzeVideo(filePath: string): Promise<{ content: string; warnings: string[] }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chatspace-ai-video-'));
  const content: string[] = [];
  const warnings: string[] = [];
  try {
    try {
      const transcript = await transcribeAudio(filePath);
      if (transcript) content.push(`Speech transcript:\n${transcript}`);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Video speech could not be transcribed.');
    }
    try {
      const pattern = path.join(tempDir, 'frame-%02d.png');
      await execFileAsync(process.env.FFMPEG_BIN || 'ffmpeg', ['-y', '-i', filePath, '-vf', 'fps=1/2,scale=1024:-1', '-frames:v', '4', pattern], { maxBuffer: 1024 * 1024, timeout: MEDIA_COMMAND_TIMEOUT_MS });
      const frameNames = (await fs.readdir(tempDir)).filter((name) => name.endsWith('.png'));
      if (frameNames.length) {
        const images = await Promise.all(frameNames.map(async (name) => (await fs.readFile(path.join(tempDir, name))).toString('base64')));
        const visual = await ollama(
          'Transcribe all relevant visible English and Hindi text faithfully, then briefly describe only observable content. Preserve dates, times, task wording, and names exactly when visible. Do not invent facts or tasks.',
          { images, model: VISION_MODEL },
        );
        if (visual) content.push(`Visual content:\n${visual}`);
      }
    } catch {
      warnings.push('Video frames could not be analyzed.');
    }
    return { content: content.join('\n\n'), warnings };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function formatSource(source: ReviewSource): string {
  return `<source id="${source.id}" type="${source.type}" timestamp="${new Date(source.createdAt).toISOString()}">\n${source.content.slice(0, MAX_TEXT_PER_MESSAGE)}\n</source>`;
}

async function extractTasksForSource(source: ReviewSource): Promise<AiReminder[]> {
  if (isTrivialTestMessage(source.content)) return [];
  const fallback = deterministicReminders(source);
  // Direct, explicit commitments are already verified from their original
  // transcript/message. Return them immediately instead of spending another
  // expensive vision-model round trip for the same source.
  if (fallback.length || !couldContainTask(source.content)) return fallback;
  let extracted: AiReminder[] = [];
  try {
    const result = await ollama(
      `You are a precise multilingual task extractor. Review this one source only. Extract every explicit commitment, planned action, request, meeting, appointment, deadline, follow-up, reminder, or to-do. This includes future plans even without a date, such as "Tomorrow I will go to the supermarket to pick up groceries." Support English, Hindi (Devanagari), and Roman Hindi.\n\nDo not extract a greeting, a completed status such as "done", a generic test/reply label, a profile biography, a capability, or an action you infer rather than see. Return no item when no task is stated. Evidence must be a short exact quote from the source in its original language. sourceId must exactly match the source id. due must be an exact source date/time phrase, or null. The task must be concise and preserve the source language when possible.\n\n${formatSource(source)}`,
      { schema: REMINDER_SCHEMA },
    );
    const parsed = parseJson<{ reminders?: unknown }>(result);
    if (parsed && Array.isArray(parsed.reminders)) extracted = modelReminders(parsed.reminders as ReminderCandidate[], source);
  } catch {
    // The verified lexical fallback still returns clear commitments during a
    // transient structured-output failure.
  }
  return dedupeReminders([...extracted, ...fallback]);
}

function summarizeSources(sources: ReviewSource[]): string {
  const selected: string[] = [];
  let length = 0;
  for (const source of [...sources].reverse()) {
    const part = formatSource(source);
    if (length + part.length > MAX_SUMMARY_CHARS) break;
    selected.unshift(part);
    length += part.length + 2;
  }
  return selected.join('\n\n');
}

async function createSummary(sources: ReviewSource[]): Promise<{ summary: string; highlights: string[]; warning?: string }> {
  const result = await ollama(
    `Write a concise, factual summary of this personal chat vault. Only use information in the sources. Do not invent people, relationships, tasks, deadlines, or facts. Ignore trivial test messages.\n\nSOURCES:\n${summarizeSources(sources)}`,
    { schema: SUMMARY_SCHEMA },
  );
  const parsed = parseJson<{ summary?: unknown; highlights?: unknown }>(result);
  if (!parsed || typeof parsed.summary !== 'string') return { summary: result || 'The local model did not return a usable summary.', highlights: [], warning: 'The model returned an unstructured summary.' };
  return {
    summary: parsed.summary.trim(),
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((item): item is string => typeof item === 'string').slice(0, 8) : [],
  };
}

async function analyzeMessage(
  userId: number,
  message: Message,
  mediaAllowed: boolean,
): Promise<{ source: ReviewSource | null; reminders: AiReminder[]; warnings: string[]; usedMedia: boolean }> {
  const warnings: string[] = [];
  const messageId = Number(message.id);
  if (!Number.isSafeInteger(messageId)) return { source: null, reminders: [], warnings: [`Invalid message id: ${message.id}.`], usedMedia: false };
  try {
    const cached = await getCachedAiMessageAnalysis(userId, messageId, message.updatedAt, PIPELINE_VERSION);
    if (cached) {
      return {
        source: cached.sourceContent ? { id: message.id, createdAt: message.createdAt, type: message.type, content: cached.sourceContent } : null,
        reminders: cached.reminders,
        warnings,
        usedMedia: false,
      };
    }
  } catch (error) {
    warnings.push(`Message #${message.id} could not use the AI cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const content: string[] = [];
  let usedMedia = false;
  if (message.text?.trim()) content.push(`Text message:\n${message.text.trim().slice(0, MAX_TEXT_PER_MESSAGE)}`);
  const isMedia = message.type === 'image' || message.type === 'audio' || message.type === 'voice' || message.type === 'video';
  if (isMedia && !mediaAllowed) {
    warnings.push(`Message #${message.id} media was skipped because this review is limited to ${MAX_REVIEW_MEDIA} media items.`);
  } else if (message.type === 'image' && message.fileUrl) {
    usedMedia = true;
    try {
      const filePath = localUploadPath(message.fileUrl);
      if (!filePath) throw new Error('The image is not stored locally.');
      const visual = await analyzeImage(filePath);
      if (visual) content.push(`Image content:\n${visual}`);
    } catch (error) {
      warnings.push(`Message #${message.id} image could not be analyzed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if ((message.type === 'audio' || message.type === 'voice') && message.fileUrl) {
    usedMedia = true;
    try {
      const filePath = localUploadPath(message.fileUrl);
      if (!filePath) throw new Error('The audio is not stored locally.');
      const transcript = await transcribeAudio(filePath);
      if (transcript) content.push(`Speech transcript:\n${transcript}`);
    } catch (error) {
      warnings.push(`Message #${message.id} audio could not be analyzed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (message.type === 'video' && message.fileUrl) {
    usedMedia = true;
    try {
      const filePath = localUploadPath(message.fileUrl);
      if (!filePath) throw new Error('The video is not stored locally.');
      const video = await analyzeVideo(filePath);
      if (video.content) content.push(video.content);
      warnings.push(...video.warnings.map((warning) => `Message #${message.id}: ${warning}`));
    } catch (error) {
      warnings.push(`Message #${message.id} video could not be analyzed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const source = content.length ? { id: message.id, createdAt: message.createdAt, type: message.type, content: content.join('\n\n') } : null;
  const reminders = source ? await extractTasksForSource(source) : [];
  if (source) {
    try {
      await saveCachedAiMessageAnalysis(userId, messageId, message.updatedAt, PIPELINE_VERSION, { sourceContent: source.content, reminders });
    } catch (error) {
      warnings.push(`Message #${message.id} could not save the AI cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return { source, reminders, warnings, usedMedia };
}

export async function createAiReview(userId: number, messages: Message[]): Promise<AiReview> {
  const warnings: string[] = [];
  const analyzed = { text: 0, images: 0, audio: 0, videos: 0 };
  const selectedMessages = messages.slice(-MAX_REVIEW_MESSAGES);
  if (messages.length > selectedMessages.length) warnings.push(`Reviewed the most recent ${MAX_REVIEW_MESSAGES} messages.`);
  const sources: ReviewSource[] = [];
  const reminders: AiReminder[] = [];
  let mediaCount = 0;

  for (const message of selectedMessages) {
    const isMedia = message.type === 'image' || message.type === 'audio' || message.type === 'voice' || message.type === 'video';
    const result = await analyzeMessage(userId, message, !isMedia || mediaCount < MAX_REVIEW_MEDIA);
    if (isMedia && result.usedMedia) mediaCount++;
    if (result.source) {
      sources.push(result.source);
      if (message.text?.trim()) analyzed.text++;
      if (message.type === 'image') analyzed.images++;
      if (message.type === 'audio' || message.type === 'voice') analyzed.audio++;
      if (message.type === 'video') analyzed.videos++;
    }
    reminders.push(...result.reminders);
    warnings.push(...result.warnings);
  }

  if (!sources.length) return { summary: 'There is no text or supported media to review yet.', highlights: [], reminders: [], analyzed, warnings };
  const summary = await createSummary(sources);
  if (summary.warning) warnings.push(summary.warning);
  return { summary: summary.summary, highlights: summary.highlights, reminders: dedupeReminders(reminders), analyzed, warnings };
}
