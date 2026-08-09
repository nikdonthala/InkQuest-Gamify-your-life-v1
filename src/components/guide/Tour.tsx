import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---- first-run guided tour: popup cards that highlight real UI elements ----
interface TourStep {
  id: string;
  target?: string; // CSS selector of the element to spotlight
  emoji: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="xp"]',
    emoji: '📓',
    title: 'Welcome to InkQuest',
    body: 'Your hand-drawn life book. Every page is paper you can draw on, every habit you mark feeds this XP bar — and everything autosaves to this device.'
  },
  {
    id: 'draw',
    target: '[data-tour="pen"]',
    emoji: '🖊️',
    title: 'Draw anywhere',
    body: 'Grab the pen — or pencil, marker, brush, highlighter, calligraphy pen — and scribble straight onto the paper. Undo with Ctrl+Z, erase with the eraser.'
  },
  {
    id: 'blocks',
    target: '[data-tour="add-block"]',
    emoji: '🧱',
    title: 'Add blocks',
    body: 'Tap the + on any page (or press “/”) to add headings, to-do lists, sticky notes, washi tape — and trackers.'
  },
  {
    id: 'format',
    target: '[data-tour="add-block"]',
    emoji: '🗓️',
    title: 'Choose a format',
    body: 'In the picker, pick a tracker format from the dropdown: Yearly, Monthly, Weekly (horizontal), or Graphical — then tap “+ Add”.'
  },
  {
    id: 'habits',
    target: '[data-tour="habits"]',
    emoji: '✍️',
    title: 'Habits earn XP — live',
    body: 'Open Habits to create routines. Tap a square on any grid to mark a day: XP, INK and stat points update instantly, right on the page.'
  },
  {
    id: 'missions',
    target: '[data-tour="missions"]',
    emoji: '☑️',
    title: 'Missions & streaks',
    body: 'Daily missions, combo multipliers and streaks turn consistency into rewards. Finish everything today for a Perfect Day: +100 XP.'
  },
  {
    id: 'zoom',
    target: '[data-tour="zoom"]',
    emoji: '🔍',
    title: 'Zoom & move around',
    body: 'Use − / + or Ctrl+scroll to zoom the pages, and scroll or use the arrows to flip through your notebook like an iPad app.'
  },
  {
    id: 'done',
    emoji: '🎉',
    title: 'You’re ready!',
    body: 'Explore the character sheet 📊, achievements 🏆, Ink shop 🛍️, analytics 📈 and the AI assistant 🤖 whenever you like. Happy writing!'
  }
];

const CARD_W = 340;

export default function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [, setTick] = useState(0);

  // re-measure targets while open (scrolls, resizes, layout shifts)
  useEffect(() => {
    if (!open) return;
    const iv = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(iv);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = STEPS[stepIdx];
    if (step?.target) {
      const el = document.querySelector(step.target);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [open, stepIdx]);

  const finish = () => {
    localStorage.setItem('inkquest-tour', '1');
    onClose();
  };

  const step = STEPS[stepIdx];

  // spotlight geometry (fixed px relative to viewport)
  let ring: { left: number; top: number; width: number; height: number } | null = null;
  if (open && step?.target) {
    const el = document.querySelector(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) ring = { left: r.left - 10, top: r.top - 10, width: r.width + 20, height: r.height + 20 };
    }
  }

  // popup placement
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let card = { x: (vw - CARD_W) / 2, y: vh / 2 - 120, side: 'center' as 'center' | 'below' | 'above' };
  if (ring) {
    const cx = Math.max(12, Math.min(ring.left, vw - CARD_W - 12));
    if (ring.top + ring.height + 260 < vh) {
      card = { x: cx, y: ring.top + ring.height + 14, side: 'below' };
    } else if (ring.top - 250 > 12) {
      card = { x: cx, y: ring.top - 250, side: 'above' };
    } else {
      card = { x: cx, y: Math.max(12, ring.top + ring.height - 230), side: 'below' };
    }
  }

  return (
    <AnimatePresence>
      {open && step && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {/* soft dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#14120e]/40"
          />

          {/* spotlight ring */}
          {ring && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute rounded-2xl border-2 border-accent-amber"
              style={{
                left: ring.left,
                top: ring.top,
                width: ring.width,
                height: ring.height,
                boxShadow: '0 0 0 4px rgba(255,255,255,0.35), 0 10px 34px rgba(0,0,0,0.45)',
                pointerEvents: 'none'
              }}
            />
          )}

          {/* popup card */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="absolute paper-grid grain rounded-2xl border-2 border-ink/15 shadow-lift px-5 py-4 pointer-events-auto"
            style={{ left: card.x, top: card.y, width: CARD_W }}
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl animate-wiggle shrink-0">{step.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-ink leading-tight">{step.title}</div>
                <p className="mt-1 text-[12.5px] text-ink-soft leading-snug">{step.body}</p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between">
              <button onClick={finish} className="text-[11px] text-ink-faint hover:text-accent-red underline underline-offset-2 transition">
                Skip tour
              </button>
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <div key={s.id} className={`h-1.5 rounded-full transition-all ${i === stepIdx ? 'w-4 bg-accent-red' : 'w-1.5 bg-ink/20'}`} />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  disabled={stepIdx === 0}
                  className="w-7 h-7 rounded-lg border border-ink/20 text-ink-soft text-[12px] hover:bg-ink/5 disabled:opacity-30 transition"
                >
                  ‹
                </button>
                <button
                  onClick={() => (stepIdx >= STEPS.length - 1 ? finish() : setStepIdx((i) => i + 1))}
                  className="rounded-lg bg-accent-red text-white px-3.5 h-7 text-[12px] font-semibold hover:bg-accent-red/85 active:scale-95 transition"
                >
                  {stepIdx >= STEPS.length - 1 ? 'Done ✓' : 'Next →'}
                </button>
              </div>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-paper border-l-2 border-t-2 border-ink/15 pointer-events-none" style={{ display: card.side === 'below' ? 'block' : 'none' }} />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-paper border-b-2 border-r-2 border-ink/15 pointer-events-none" style={{ display: card.side === 'above' ? 'block' : 'none' }} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
