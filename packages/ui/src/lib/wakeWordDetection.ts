/**
 * On-device wake ASR (Whisper tiny) is weak on rare names. We bias decoding with a long
 * initial_prompt and accept several plausible spellings / “dah dee” phonetic outputs.
 */

export const WAKE_WORD_INITIAL_PROMPT = [
  'Dadei.',
  'Wake word: Dadei.',
  'Spelled D-A-D-E-I.',
  'Pronounced dah-dee, like "dah dee" or "da dee".',
  'Not "daddy". Not "day day". Not "diddy".',
].join(' ');

/**
 * True when the transcript is plausibly the user saying the wake word "Dadei".
 * Intentionally stricter on "daddy" alone to avoid accidental triggers.
 */
export function transcriptLikelyContainsWakeWord(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;

  const lower = raw.toLowerCase().normalize('NFKD');

  const hasDadeiShape =
    /\bdadei\b/.test(lower) ||
    /\bdadey\b/.test(lower) ||
    /\bdadee\b/.test(lower) ||
    /\bdaday\b/.test(lower) ||
    /\bdah[-\s]?dee\b/.test(lower) ||
    /\bda[-\s]?dee\b/.test(lower) ||
    /\bda\s+d[eiy]\b/.test(lower) ||
    /\bda[-\s]?dei\b/.test(lower) ||
    /\bdade\s*[-]?\s*i\b/.test(lower);

  if (hasDadeiShape) return true;

  // Collapsed spacing / punctuation: "dahdee", "daday"
  const collapsed = lower.replace(/[^a-z]/g, '');
  if (/dadei|dadey|dadee|daday|dahdee|dadai|dadeh/.test(collapsed)) return true;

  // "daddy" alone is a common mis-hear; avoid firing unless we also see a Dadei-like token.
  if (/\bdaddy\b/.test(lower)) return false;

  return false;
}
