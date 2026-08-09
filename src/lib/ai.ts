// ---- Inky AI: Groq-powered notebook companion ----
import type { Snapshot } from '../types';
import { ACHIEVEMENTS, habitStreak, levelFromXp } from './gamify';
import { lastNDays, todayISO } from './dates';

// models actually available on the provided key (llama-4-scout is not on this account)
export const GROQ_MODELS: { id: string; label: string }[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (default)' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
  { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B' },
  { id: 'groq/compound', label: 'Compound' },
  { id: 'groq/compound-mini', label: 'Compound Mini' }
];

export const GROQ_MODEL = GROQ_MODELS[0].id;
// NOTE: no API key lives in this file. The production key is kept server-side in the
// serverless proxy (api/chat.mjs, env GROQ_API_KEY) so it never ships to the browser.
// A key pasted by the user (stored only in their browser) or a dev-only VITE_GROQ_API_KEY
// are used directly for local development.

export function getGroqKey(): string {
  return (localStorage.getItem('inkquest-groq-key') ?? '').trim();
}

export function setGroqKey(k: string) {
  localStorage.setItem('inkquest-groq-key', k.trim());
}

export function resetGroqKey() {
  localStorage.removeItem('inkquest-groq-key');
}

export function getGroqModel(): string {
  return localStorage.getItem('inkquest-groq-model') ?? GROQ_MODEL;
}

export function setGroqModel(id: string) {
  localStorage.setItem('inkquest-groq-model', id);
}

export interface AiMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const SYSTEM_PROMPT = `You are Inky, a warm, concise AI companion living inside InkQuest — a hand-drawn habit notebook app. You chat like a supportive coach who loves physical notebooks. Rules:
- Use only the notebook data provided; never invent facts about the user.
- Keep answers short and practical (under ~180 words). Use plain text with simple "- " bullet lists when helpful.
- Match the app's calm, encouraging tone. No hype and no emoji spam (one or two max).`;

export function buildNotebookContext(snap: Snapshot): string {
  const meta = snap.meta;
  const level = levelFromXp(meta.xp);
  const days = lastNDays(7);
  const habits = snap.habits
    .map((h) => {
      const streak = habitStreak(h, new Date());
      const recent = days.map((d) => (h.entries[d] ? '✓' : '·')).join('');
      const total = Object.keys(h.entries).length;
      return `${h.name} [${h.difficulty}, ${h.stat}] streak ${streak.current}d (best ${streak.best}) · ${total} completions · last 7d: ${recent}`;
    })
    .join('\n');
  return [
    `Today: ${todayISO()}`,
    `Level ${level} · XP ${meta.xp} · INK ${meta.ink} · perfect days ${meta.perfectDays} · achievements ${meta.achievements.length}/${ACHIEVEMENTS.length}`,
    `Stats: ${Object.entries(meta.statXp)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
    `Habits:\n${habits || '(none created yet)'}`
  ].join('\n');
}

export async function chatGroq(messages: AiMsg[], signal?: AbortSignal): Promise<string> {
  const customKey = getGroqKey();
  const devKey = (import.meta.env.VITE_GROQ_API_KEY as string | undefined)?.trim();
  const model = getGroqModel();

  let res: Response;
  if (customKey || devKey) {
    // user-provided (or dev-only) key → call Groq directly
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customKey || devKey}`
      },
      body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 700 })
    });
  } else {
    // production: route through the serverless proxy — the key stays on the server
    res = await fetch('/api/chat', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages })
    });
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      /* noop */
    }
    throw new Error(detail || `AI request failed (${res.status})`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? '').trim();
}
