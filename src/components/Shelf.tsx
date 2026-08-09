import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../state/AppContext';
import { COVERS } from '../types';
import { InkQuestLogo } from './InkQuestLogo';
import { PaperModal, Tip } from './ui';
import { levelProgress } from '../lib/gamify';

export default function Shelf() {
  const { state, act, levelInfo, overallStreak } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [cover, setCover] = useState('ink');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [welcome, setWelcome] = useState(() => localStorage.getItem('inkquest-tour') === null);

  const startTour = () => {
    const nb = state.snap.notebooks[0];
    if (!nb) return;
    localStorage.setItem('inkquest-tour', 'pending');
    setWelcome(false);
    act.openNotebook(nb.id);
  };

  const notebooks = state.snap.notebooks;
  const dark = state.ui.dark;

  const create = () => {
    act.createNotebook(name.trim() || 'Untitled notebook', cover);
    setCreateOpen(false);
    setName('');
    setCover('ink');
  };

  return (
    <div className={`h-full overflow-y-auto ${dark ? 'bg-[#1d1e22]' : 'bg-gradient-to-b from-[#efe9da] to-[#e2d8c0]'} transition-colors`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <InkQuestLogo size={58} className="shrink-0 drop-shadow-sm" />
            <div>
              <div className={`font-hand text-6xl leading-none ${dark ? 'text-paper' : 'text-ink'} animate-wobble`} style={{ transformOrigin: 'left' }}>
                InkQuest
              </div>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="font-hand text-[22px] text-accent-red">gamify your life</span>
                <span className={`text-xs ${dark ? 'text-paper/50' : 'text-ink-faint'}`}>— a hand-drawn habit notebook: draw, track, level up</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`rounded-xl px-3 py-2 text-center shadow-paper-sm ${dark ? 'bg-paper/10' : 'bg-white/50'}`}>
              <div className={`text-lg font-bold ${dark ? 'text-paper' : 'text-ink'}`}>LV {levelInfo.level}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-faint">level</div>
            </div>
            <div className={`rounded-xl px-3 py-2 text-center shadow-paper-sm ${dark ? 'bg-paper/10' : 'bg-white/50'}`}>
              <div className={`text-lg font-bold ${dark ? 'text-paper' : 'text-ink'}`}>🖋️ {state.snap.meta.ink}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-faint">ink</div>
            </div>
            <div className={`rounded-xl px-3 py-2 text-center shadow-paper-sm ${dark ? 'bg-paper/10' : 'bg-white/50'}`}>
              <div className={`text-lg font-bold ${dark ? 'text-paper' : 'text-ink'}`}>🔥 {overallStreak}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-faint">day streak</div>
            </div>
            <button onClick={() => act.setDark(!dark)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-paper-sm transition hover:scale-105 ${dark ? 'bg-paper/10 text-paper' : 'bg-white/50'}`} title="Dark mode">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* notebooks */}
        <div className="mt-10">
          <div className={`font-hand text-3xl mb-4 ${dark ? 'text-paper/80' : 'text-ink-soft'}`}>My notebooks</div>
          <div className="flex flex-wrap gap-6">
            <AnimatePresence>
              {notebooks.map((nb, i) => {
                const cov = COVERS.find((c) => c.key === nb.cover) ?? COVERS[0];
                const pageCount = nb.pages.length;
                return (
                  <motion.div
                    key={nb.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.06, type: 'spring', damping: 20 }}
                    className="group relative"
                  >
                    <button onClick={() => act.openNotebook(nb.id)} className="block" title={`Open ${nb.name}`}>
                      <div className="relative transition-transform group-hover:-translate-y-2 group-hover:rotate-[-1.2deg] group-hover:scale-[1.03] duration-300">
                        {/* page edges */}
                        <div className="absolute inset-y-1 right-[-7px] w-2 rounded-r-sm bg-[#f3eddd] shadow-paper-sm" />
                        <div className="absolute inset-y-2 right-[-11px] w-2 rounded-r-sm bg-[#e9e1cc] shadow-paper-sm" />
                        {/* cover */}
                        <div
                          className="w-44 h-60 rounded-r-lg rounded-l-md shadow-lift border border-black/20 relative overflow-hidden flex flex-col justify-between p-3"
                          style={{ background: cov.color }}
                        >
                          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 5px)' }} />
                          <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold relative">notebook</div>
                          <div className="relative">
                            <div className="font-hand text-[26px] leading-tight text-white/95 break-words">{nb.name}</div>
                            <div className="mt-1 text-[10px] text-white/60">{pageCount} pages</div>
                          </div>
                          <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                            <div className="h-full bg-accent-amber/90 rounded-full" style={{ width: `${Math.min(100, pageCount * 8)}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => { setRenaming(nb.id); setRenameVal(nb.name); }}
                        className="rounded-full bg-paper border border-ink/20 text-[10px] px-2 py-0.5 shadow-paper-sm hover:bg-ink/10 transition"
                      >
                        rename
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${nb.name}"? This can't be undone.`)) act.deleteNotebook(nb.id); }}
                        className="rounded-full bg-accent-red text-white text-[10px] px-2 py-0.5 shadow-paper-sm hover:bg-accent-red/85 transition"
                      >
                        delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* new notebook */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: notebooks.length * 0.06 + 0.1 }}
                onClick={() => setCreateOpen(true)}
                className="w-44 h-60 rounded-lg border-[3px] border-dashed border-ink/25 dark:border-white/25 flex flex-col items-center justify-center gap-2 text-ink-soft dark:text-paper/60 hover:border-accent-red/60 hover:text-accent-red transition"
              >
                <span className="text-3xl">📒</span>
                <span className="text-sm font-semibold">New notebook</span>
              </motion.button>
            </AnimatePresence>
          </div>
        </div>

        {/* footer */}
        <div className="mt-16 pb-4 text-center">
          <div className="font-hand text-2xl text-ink-faint">“The notebook is the world. The habits are your actions.”</div>
          <div className="mt-3 text-[11px] text-ink-faint/80">
            ✍️ everything autosaves to this device · works offline · install as an app
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-widest text-ink-faint/70 font-semibold">InkQuest v1.0 · gamify your life</div>
          <div className="mt-3 flex items-center justify-center gap-4 flex-wrap">
            <a
              href="https://github.com/nikdonthala"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-[12px] underline underline-offset-2 transition ${dark ? 'text-paper/50 hover:text-accent-amber' : 'text-ink-faint/70 hover:text-accent-red'}`}
              title="InkQuest — created by nikdonthala on GitHub"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              Created by nikdonthala
            </a>
            <Tip label="Restore the original demo data">
              <button onClick={() => { if (confirm('Reset all data back to the demo notebook?')) act.reset(); }} className="text-[11px] text-ink-faint/60 hover:text-accent-red underline underline-offset-2 transition">
                reset demo data
              </button>
            </Tip>
          </div>
        </div>
      </div>

      {/* new notebook modal */}
      <PaperModal open={createOpen} onClose={() => setCreateOpen(false)} title="Start a new notebook" width={480}>
        <div className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Notebook name… e.g. Morning Pages"
            className="w-full rounded-xl border-2 border-ink/20 bg-white/50 px-4 py-2.5 text-sm"
          />
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-2">Cover</div>
            <div className="flex gap-2 flex-wrap">
              {COVERS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCover(c.key)}
                  className={`w-14 h-[72px] rounded-md shadow-paper-sm transition hover:scale-105 ${cover === c.key ? 'ring-3 ring-accent-red ring-offset-2 ring-offset-paper' : ''}`}
                  style={{ background: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <button onClick={create} className="w-full rounded-xl bg-accent-red text-white py-2.5 font-semibold shadow-paper-sm hover:bg-accent-red/85 transition active:scale-[0.99]">
            Create & open →
          </button>
        </div>
      </PaperModal>

      {/* first-run welcome popup */}
      <PaperModal open={welcome} onClose={() => { localStorage.setItem('inkquest-tour', '1'); setWelcome(false); }} title="Welcome to InkQuest 👋" width={420}>
        <div className="flex flex-col gap-4">
          <div className="text-center text-5xl animate-wiggle">📓</div>
          <p className="text-sm text-ink-soft text-center leading-relaxed">
            InkQuest is a hand-drawn habit notebook that levels you up. Every page is paper you can draw on,
            every habit you mark earns XP — in real time.
          </p>
          <button onClick={startTour} className="w-full rounded-xl bg-accent-red text-white py-2.5 font-semibold shadow-paper-sm hover:bg-accent-red/85 transition active:scale-[0.99]">
            Take the 60-second tour →
          </button>
          <button
            onClick={() => { localStorage.setItem('inkquest-tour', '1'); setWelcome(false); }}
            className="w-full rounded-xl bg-ink/5 text-ink-soft py-2.5 font-semibold hover:bg-ink/10 transition"
          >
            Explore on my own
          </button>
        </div>
      </PaperModal>

      {/* rename modal */}
      <PaperModal open={renaming !== null} onClose={() => setRenaming(null)} title="Rename notebook" width={420}>
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (renaming && renameVal.trim()) act.renameNotebook(renaming, renameVal.trim());
              setRenaming(null);
            }
          }}
          className="w-full rounded-xl border-2 border-ink/20 bg-white/50 px-4 py-2.5 text-sm"
        />
        <button
          onClick={() => {
            if (renaming && renameVal.trim()) act.renameNotebook(renaming, renameVal.trim());
            setRenaming(null);
          }}
          className="mt-3 w-full rounded-xl bg-ink text-paper py-2.5 font-semibold shadow-paper-sm hover:bg-ink/85 transition"
        >
          Save
        </button>
      </PaperModal>
    </div>
  );
}
