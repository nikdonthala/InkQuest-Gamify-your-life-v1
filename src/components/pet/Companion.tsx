import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { petStageForLevel } from '../../lib/gamify';
import { todayISO } from '../../lib/dates';

function moodOf(
  satisfaction: number,
  streak: number,
  todayDone: number
): { eyes: 'happy' | 'neutral' | 'sleepy'; text: string } {
  if (todayDone > 0) return { eyes: 'happy', text: 'Nice work today! 🎉' };
  if (streak >= 7) return { eyes: 'happy', text: `${streak}-day combo on fire! 🔥` };
  if (satisfaction >= 70) return { eyes: 'happy', text: 'Warm ink, steady hands…' };
  if (satisfaction >= 45) return { eyes: 'neutral', text: 'Keep the streak alive…' };
  return { eyes: 'sleepy', text: 'A little rest is okay. Start again.' };
}

export default function Companion({ onClose }: { onClose: () => void }) {
  const { state, level, overallStreak } = useApp();
  const pet = state.snap.meta.pet;
  const stage = petStageForLevel(level);
  const todayDone = state.snap.habits.filter((h) => h.entries[todayISO()]).length;
  const mood = moodOf(pet.satisfaction, overallStreak, todayDone);
  const sat = Math.max(0, Math.min(100, pet.satisfaction));

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
      className="w-[190px] shrink-0 h-full flex flex-col items-center py-4 gap-2 bg-[#2d2a26]/95 border-l border-black/20 relative"
    >
      <div className="absolute top-2 left-2">
        <button onClick={onClose} className="text-paper/50 hover:text-paper text-xs transition">
          ✕ hide
        </button>
      </div>
      <div className="font-hand text-[20px] text-paper/90">{pet.name}</div>
      <div className="text-[10px] uppercase tracking-widest text-paper/40 font-semibold">{pet.type} · bond LV {stage}</div>

      {/* speech bubble */}
      <div className="relative bg-paper rounded-lg px-2.5 py-1.5 text-[11px] text-ink max-w-[150px] text-center shadow-paper-sm">
        {mood.text}
        <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-paper rotate-45" />
      </div>

      <div className="animate-floaty mt-1">
        <Fox stage={stage} eyes={mood.eyes} />
      </div>

      <div className="w-[130px] mt-2">
        <div className="flex justify-between text-[9px] text-paper/50 mb-0.5">
          <span>mood</span>
          <span>{sat}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-paper/15 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-amber"
            animate={{ width: `${sat}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
      </div>

      <div className="mt-1 text-[10px] text-paper/40 text-center leading-relaxed px-3">
        {stage === 1 && 'Complete habits to bond & evolve.'}
        {stage === 2 && 'Bond LV 2 — wearing a scarf now.'}
        {stage === 3 && 'Bond LV 3 — a crowned legend.'}
      </div>
    </motion.div>
  );
}

export function Fox({ stage = 1, eyes = 'happy' }: { stage?: number; eyes?: 'happy' | 'neutral' | 'sleepy' }) {
  const scale = 0.9 + stage * 0.12;
  return (
    <svg width={110 * scale} height={130 * scale} viewBox="0 0 120 140" fill="none" style={{ overflow: 'visible' }}>
      {/* tail */}
      <path d="M76 104 Q 104 96 108 72 Q 111 58 98 62 Q 90 65 92 74 Q 93 82 84 92 Z" fill="#e8915a" stroke="#2c2a26" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M98 62 Q 106 62 106 70 Q 106 76 100 78 Q 96 74 98 66 Z" fill="#fff8ec" stroke="#2c2a26" strokeWidth="1.8" />
      {/* body */}
      <ellipse cx="62" cy="112" rx="24" ry="17" fill="#e8915a" stroke="#2c2a26" strokeWidth="2.4" />
      <ellipse cx="52" cy="118" rx="6" ry="4" fill="#fff8ec" stroke="#2c2a26" strokeWidth="1.4" />
      <ellipse cx="74" cy="118" rx="6" ry="4" fill="#fff8ec" stroke="#2c2a26" strokeWidth="1.4" />
      {/* ears */}
      <path d="M32 58 L36 24 L56 46 Z" fill="#e8915a" stroke="#2c2a26" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M88 58 L84 24 L64 46 Z" fill="#e8915a" stroke="#2c2a26" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M39 51 L42 33 L54 45 Z" fill="#f6c9a8" />
      <path d="M81 51 L78 33 L66 45 Z" fill="#f6c9a8" />
      {/* head */}
      <path d="M62 40 C 36 40 30 60 34 78 C 38 94 46 104 62 104 C 78 104 86 94 90 78 C 94 60 88 40 62 40 Z" fill="#e8915a" stroke="#2c2a26" strokeWidth="2.4" strokeLinejoin="round" />
      {/* muzzle */}
      <ellipse cx="62" cy="84" rx="17" ry="12" fill="#fff8ec" stroke="#2c2a26" strokeWidth="1.8" />
      <path d="M62 80 L57 87 L67 87 Z" fill="#2c2a26" />
      <path d="M58 74 L48 70 M66 74 L76 70" stroke="#2c2a26" strokeWidth="1.4" strokeLinecap="round" />
      {/* eyes */}
      {eyes === 'happy' && (
        <>
          <path d="M45 68 Q 50 62 55 68" stroke="#2c2a26" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M69 68 Q 74 62 79 68" stroke="#2c2a26" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === 'neutral' && (
        <>
          <circle cx="50" cy="66" r="2.8" fill="#2c2a26" />
          <circle cx="74" cy="66" r="2.8" fill="#2c2a26" />
        </>
      )}
      {eyes === 'sleepy' && (
        <>
          <path d="M44 68 L54 67" stroke="#2c2a26" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M70 67 L80 68" stroke="#2c2a26" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      {/* cheeks */}
      <circle cx="40" cy="78" r="4.5" fill="#f2a0a0" opacity="0.55" />
      <circle cx="84" cy="78" r="4.5" fill="#f2a0a0" opacity="0.55" />

      {/* scarf (stage 2+) */}
      {stage >= 2 && (
        <>
          <path d="M42 96 Q 62 106 82 96 L 80 104 Q 62 114 44 104 Z" fill="#c0392b" stroke="#2c2a26" strokeWidth="2" strokeLinejoin="round" />
          <path d="M74 102 L 78 118 L 68 114 Z" fill="#c0392b" stroke="#2c2a26" strokeWidth="1.8" strokeLinejoin="round" />
        </>
      )}
      {/* crown (stage 3+) */}
      {stage >= 3 && (
        <path
          d="M44 22 L 48 31 L 56 25 L 62 34 L 68 25 L 76 31 L 80 22 L 80 38 L 44 38 Z"
          fill="#c9a227"
          stroke="#2c2a26"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
