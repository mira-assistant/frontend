/// <reference lib="webworker" />

import { pipeline } from '@xenova/transformers';
import { WAKE_WORD_INITIAL_PROMPT } from '../lib/wakeWordDetection';

type MainToWorker = { type: 'transcribe'; audio: Float32Array };
type WorkerToMain = { type: 'result'; text: string };

let asr: Awaited<ReturnType<typeof pipeline>> | null = null;
let loading: Promise<void> | null = null;
let processing = false;
const queue: Float32Array[] = [];
const MAX_QUEUE = 2;

async function ensurePipeline() {
  if (asr) return;
  if (!loading) {
    loading = (async () => {
      asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    })();
  }
  await loading;
}

type AsrFn = (
  input: Float32Array,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>;

async function runTranscribe(audio: Float32Array) {
  await ensurePipeline();
  if (!asr) return;
  const out = await (asr as unknown as AsrFn)(audio, {
    initial_prompt: WAKE_WORD_INITIAL_PROMPT,
    language: 'english',
    task: 'transcribe',
  });
  let text = '';
  if (typeof out === 'string') {
    text = out;
  } else if (out && typeof out === 'object' && 'text' in out && typeof (out as { text: string }).text === 'string') {
    text = (out as { text: string }).text;
  }
  const payload: WorkerToMain = { type: 'result', text };
  self.postMessage(payload);
}

async function pump() {
  if (processing) return;
  const next = queue.shift();
  if (!next) return;
  processing = true;
  try {
    await runTranscribe(next);
  } catch (e) {
    const payload: WorkerToMain = { type: 'result', text: '' };
    self.postMessage(payload);
  } finally {
    processing = false;
    void pump();
  }
}

self.onmessage = (ev: MessageEvent<MainToWorker>) => {
  const msg = ev.data;
  if (msg?.type !== 'transcribe' || !(msg.audio instanceof Float32Array)) return;
  while (queue.length >= MAX_QUEUE) {
    queue.shift();
  }
  queue.push(msg.audio);
  void pump();
};
