import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { ACHIEVEMENTS } from '../../lib/gamify';

export function Toasts() {
  const { state } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<{ id: string; key: number }[]>([]);

  useEffect(() => {
    if (!state.loaded) return;
    if (!seen.current) seen.current = new Set(state.snap.meta.achievements);
    else {
      const fresh = state.snap.meta.achievements.filter((a) => !seen.current!.has(a));
      fresh.forEach((id) => seen.current!.add(id));
      if (fresh.length) {
        setQueue((q) => [...q, ...fresh.map((id, i) => ({ id, key: Date.now() + i }))]);
      }
    }
  }, [state.snap.meta.achievements]);

  // simpler auto-dismiss
  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [queue]);

  return (
    <div className="fixed top-16 right-4 z-[80] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {queue.map((t) => {
          const a = ACHIEVEMENTS.find((x) => x.id === t.id);
          if (!a) return null;
          return (
            <motion.div
              key={t.key}
              initial={{ x: 80, opacity: 0, rotate: 4 }}
              animate={{ x: 0, opacity: 1, rotate: -1.5 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 220 }}
              className="flex items-center gap-3 rounded-xl paper-grid grain border-2 border-accent-red/40 shadow-lift px-4 py-3 w-72"
            >
              <div className="text-3xl animate-wiggle">{a.emoji}</div>
              <div>
                <div className="font-hand text-[15px] text-accent-red leading-none">Achievement unlocked!</div>
                <div className="font-sans font-bold text-[14px] mt-1 leading-tight">{a.name}</div>
                <div className="text-[11px] text-ink-soft">{a.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function LevelUpModal() {
  const { state, act } = useApp();
  const queue = state.snap.meta.levelQueue;
  const next = queue[0];
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (next) {
      setBurst((b) => b + 1);
      const t = setTimeout(() => setBurst(0), 1400);
      return () => clearTimeout(t);
    }
  }, [next]);

  return (
    <AnimatePresence>
      {next && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
          <motion.div
            initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 260 }}
            className="relative paper-grid grain rounded-2xl shadow-lift border-2 border-ink/20 px-10 py-8 text-center"
          >
            <motion.div
              key={burst}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, y: -30 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none"
            >
              🖋️ ✨ ✒️ ⭐
            </motion.div>
            <div className="font-hand text-5xl text-accent-red animate-wobble">LEVEL UP!</div>
            <div className="mt-2 text-ink-soft text-sm">Your character has grown</div>
            <div className="mt-4 text-6xl font-bold text-ink">{next}</div>
            <div className="mt-2 font-hand text-xl text-ink-soft">New level — new ink</div>
            <button
              onClick={act.popLevel}
              className="mt-6 rounded-xl bg-accent-red text-white px-8 py-2.5 font-semibold shadow-paper-sm hover:bg-accent-red/85 transition active:scale-95"
            >
              Keep writing →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
