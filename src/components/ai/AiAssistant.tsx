import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { PaperModal } from '../ui';
import {
  buildNotebookContext,
  chatGroq,
  getGroqModel,
  resetGroqKey,
  setGroqKey,
  setGroqModel,
  GROQ_MODELS,
  SYSTEM_PROMPT,
  type AiMsg
} from '../../lib/ai';

const QUICK: { label: string; prompt: string }[] = [
  { label: '📊 Analyze my habits', prompt: 'Analyze my habits: what is working, what is weak, and what pattern do you notice?' },
  { label: '💡 Improve', prompt: 'Give me 3 specific, practical suggestions to improve my consistency.' },
  { label: '✍️ Journal prompt', prompt: 'Give me a thoughtful journal prompt for today, tied to my current progress.' },
  { label: '📅 Monthly review', prompt: 'Write a short monthly review of my progress, like a notebook summary.' },
  { label: '📈 Summarize', prompt: 'Summarize my overall progress and what to focus on next.' }
];

export default function AiAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const [msgs, setMsgs] = useState<AiMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyVal, setKeyVal] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setMsgs([
        {
          role: 'assistant',
          content:
            "Hi! I'm Inky — your notebook companion. Ask me to analyze your habits, suggest improvements, write a journal prompt, or review your month. I read the data straight from your notebook."
        }
      ]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    return () => aborter.current?.abort();
  }, []);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    setError(null);
    const history: AiMsg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(history);
    setBusy(true);
    aborter.current = new AbortController();
    const timeout = window.setTimeout(() => aborter.current?.abort(), 30000);
    const context = buildNotebookContext(state.snap);
    try {
      const reply = await chatGroq(
        [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n--- Notebook data ---\n${context}` }, ...history.slice(-10)],
        aborter.current.signal
      );
      setMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      const aborted = aborter.current?.signal.aborted;
      setError(aborted ? 'The request timed out (30s). Try again.' : e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  };

  return (
    <PaperModal open={open} onClose={onClose} title={<><span className="text-accent-red">Inky AI</span> — your Groq companion</>} width={620}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-1.5 text-[10px] text-ink-faint uppercase tracking-widest font-semibold">
          model
          <select
            value={getGroqModel()}
            onChange={(e) => setGroqModel(e.target.value)}
            className="rounded-md border border-ink/20 bg-white/60 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-ink"
          >
            {GROQ_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setShowKey((s) => !s)}
          className="text-[10px] text-ink-faint hover:text-ink underline underline-offset-2 transition"
        >
          {showKey ? 'hide' : 'use my own key (optional)'}
        </button>
      </div>
      {showKey && (
        <div className="flex gap-2 mb-2">
          <input
            value={keyVal}
            onChange={(e) => setKeyVal(e.target.value)}
            onBlur={() => {
              if (keyVal.trim()) {
                setGroqKey(keyVal);
                setKeyVal('');
                setShowKey(false);
              }
            }}
            placeholder="Paste a Groq API key (stored only in this browser)"
            className="flex-1 text-[11px] rounded-lg border-2 border-ink/15 bg-white/50 px-3 py-1.5"
          />
          <button
            onClick={() => {
              resetGroqKey();
              setKeyVal('');
              setShowKey(false);
            }}
            className="text-[10px] text-accent-red hover:underline"
          >
            clear my key
          </button>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="h-[46vh] overflow-y-auto rounded-xl border border-ink/10 bg-white/25 p-3 space-y-2.5">
        {msgs.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {busy && (
          <div className="flex gap-2 items-start">
            <Avatar />
            <div className="rounded-xl rounded-tl-sm border border-ink/15 bg-paper px-3 py-2 shadow-paper-sm flex gap-1">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-ink/50"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, delay: d * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border-2 border-accent-red/40 bg-accent-red/5 px-3 py-2 text-[12px] text-accent-red">
            ⚠️ {error} — check the API key above (edits are stored in your browser only).
          </div>
        )}
      </div>

      {/* quick prompts */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => send(q.prompt)}
            disabled={busy}
            className="rounded-full border border-ink/20 bg-white/40 px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:border-accent-red/50 hover:text-accent-red transition disabled:opacity-40"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* input */}
      <div className="flex items-end gap-2 mt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Ask about your notebook… (Enter to send)"
          className="flex-1 resize-none rounded-xl border-2 border-ink/15 bg-white/50 px-3 py-2 text-[13px]"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-accent-red text-white px-4 py-2.5 text-sm font-semibold shadow-paper-sm hover:bg-accent-red/85 transition disabled:opacity-40 active:scale-95"
        >
          Send
        </button>
      </div>
      <div className="mt-2 text-[10px] text-ink-faint leading-relaxed">
        Powered by Groq. The app's AI key lives on the server (never in the app code or browser). Want to bring your own? Paste a key above — it is stored only in this browser.
      </div>
    </PaperModal>
  );
}

function Avatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center text-[13px] shrink-0 shadow-paper-sm">
      🦉
    </div>
  );
}

function Bubble({ role, content }: { role: AiMsg['role']; content: string }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-accent-red/90 text-white px-3 py-2 text-[13px] leading-relaxed shadow-paper-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-start">
      <Avatar />
      <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-ink/15 bg-paper px-3 py-2 shadow-paper-sm">
        {renderMd(content)}
      </div>
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <b key={i}>{p.slice(2, -2)}</b>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

function renderMd(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: number) => {
    if (list.length) {
      out.push(
        <ul key={`ul${key}`} className="list-disc pl-4 space-y-0.5 my-0.5">
          {list.map((li, j) => (
            <li key={j} className="text-[13px] leading-snug">
              {inline(li.replace(/^[-*•]\s*/, ''))}
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('• ')) {
      list.push(t);
      return;
    }
    flush(i);
    if (!t) return;
    if (t.startsWith('### ')) out.push(<div key={i} className="font-bold text-[13.5px] mt-1">{inline(t.slice(4))}</div>);
    else if (t.startsWith('## ')) out.push(<div key={i} className="font-bold text-[14px] mt-1">{inline(t.slice(3))}</div>);
    else if (t.startsWith('# ')) out.push(<div key={i} className="font-bold text-[15px] mt-1">{inline(t.slice(2))}</div>);
    else out.push(<p key={i} className="text-[13px] leading-relaxed">{inline(t)}</p>);
  });
  flush(999999);
  return out;
}
