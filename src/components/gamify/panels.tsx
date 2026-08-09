import React, { useState } from 'react';
import type { Difficulty, Habit, Mark, StatKey } from '../../types';
import { DIFFICULTIES, STATS, uid } from '../../types';
import { useApp } from '../../state/AppContext';
import { ACHIEVEMENTS, comboMult, habitStreak, levelFromXp } from '../../lib/gamify';
import { PaperModal, HandTag } from '../ui';
import { monthKey, todayISO } from '../../lib/dates';

// ---------------- shop data ----------------
export const SHOP_ITEMS: { id: string; kind: 'cover' | 'ink'; name: string; price: number; value: string; desc: string; emoji: string }[] = [
  { id: 'cover-forest', kind: 'cover', name: 'Forest cover', price: 120, value: 'forest', desc: 'Deep green leather', emoji: '🌲' },
  { id: 'cover-wine', kind: 'cover', name: 'Wine cover', price: 120, value: 'wine', desc: 'Burgundy suede', emoji: '🍷' },
  { id: 'cover-navy', kind: 'cover', name: 'Navy cover', price: 150, value: 'navy', desc: 'Midnight canvas', emoji: '🌌' },
  { id: 'cover-sand', kind: 'cover', name: 'Sand cover', price: 100, value: 'sand', desc: 'Warm leather', emoji: '🏜️' },
  { id: 'ink-gold', kind: 'ink', name: 'Gold ink', price: 80, value: '#c9a227', desc: 'Metallic sheen', emoji: '✨' },
  { id: 'ink-neon', kind: 'ink', name: 'Neon ink', price: 90, value: '#2fb344', desc: 'Glows in the dark', emoji: '⚡' },
  { id: 'ink-galaxy', kind: 'ink', name: 'Galaxy ink', price: 150, value: '#5b6ee1', desc: 'Deep space blue', emoji: '🌠' }
];

export const BASE_INKS = ['#2c2a26', '#3b6ea5', '#c0392b', '#3c7a4f', '#b7791f', '#7c5cbf', '#c2547e', '#e67e22', '#16a085', '#8d6e63'];

// ---------------- habits manager ----------------
export function HabitsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, act } = useApp();
  const [name, setName] = useState('');
  const [diff, setDiff] = useState<Difficulty>('medium');
  const [stat, setStat] = useState<StatKey>('discipline');
  const [color, setColor] = useState('#3b6ea5');

  const add = () => {
    if (!name.trim()) return;
    act.addHabit({ name: name.trim(), difficulty: diff, stat, color });
    setName('');
  };

  return (
    <PaperModal open={open} onClose={onClose} title={<><span className="text-accent-red">Habits</span> — your grid legends</>} width={620}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New habit… e.g. No Sugar"
          className="col-span-2 rounded-lg border-2 border-ink/20 bg-white/50 px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDiff(d.key)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold border-2 transition ${
                diff === d.key ? 'bg-accent-red text-white border-accent-red' : 'border-ink/20 hover:border-ink/40'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStat(s.key)}
              className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold border-2 transition ${
                stat === s.key ? 'text-white border-transparent' : 'border-ink/20'
              }`}
              style={stat === s.key ? { background: s.color } : undefined}
            >
              {s.label}
            </button>
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 rounded border border-ink/20 cursor-pointer" title="Ink color" />
        </div>
        <button onClick={add} className="col-span-2 rounded-lg bg-ink text-paper py-2 font-semibold text-sm hover:bg-ink/85 transition active:scale-[0.99]">
          + Add habit
        </button>
      </div>

      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
        {state.snap.habits.map((h) => (
          <HabitRow key={h.id} habit={h} />
        ))}
      </div>
    </PaperModal>
  );
}

function HabitRow({ habit }: { habit: Habit }) {
  const { act } = useApp();
  const streak = habitStreak(habit, new Date());
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(habit.name);
  const today = todayISO();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white/30 px-3 py-2">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: habit.color }} />
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (val.trim()) act.updateHabit(habit.id, { name: val.trim() });
            else setVal(habit.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="flex-1 text-sm bg-transparent border-b border-ink/30"
        />
      ) : (
        <button onClick={() => { setVal(habit.name); setEditing(true); }} className="flex-1 text-left text-sm font-medium hover:underline">
          {habit.name}
        </button>
      )}
      <span className="text-[10px] text-ink-faint hidden sm:inline">
        {DIFFICULTIES.find((d) => d.key === habit.difficulty)?.label} · {STATS.find((s) => s.key === habit.stat)?.label}
      </span>
      <span className="font-hand text-[15px] text-accent-red w-14 text-right">🔥{streak.current}</span>
      <span className={`text-[10px] font-bold w-8 text-center rounded-full py-0.5 ${habit.entries[today] ? 'bg-accent-green/20 text-accent-green' : 'bg-ink/10 text-ink-faint'}`}>
        {habit.entries[today] ? 'DONE' : 'TODO'}
      </span>
      <button
        onClick={() => act.deleteHabit(habit.id)}
        className="text-ink-faint hover:text-accent-red text-xs px-1 transition"
        title="Delete habit"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------- stats sheet ----------------
export function StatsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const meta = state.snap.meta;
  const level = levelFromXp(meta.xp);
  const max = Math.max(1, ...Object.values(meta.statXp));
  const total = Object.values(meta.statXp).reduce((a, b) => a + b, 0);

  return (
    <PaperModal open={open} onClose={onClose} title={<><span className="text-accent-red">Character sheet</span> — RPG style</>} width={560}>
      <div className="text-center mb-5">
        <div className="font-hand text-3xl text-ink">Level {level}</div>
        <div className="text-xs text-ink-faint mt-1">{meta.xp.toLocaleString()} total XP · {total} stat XP</div>
      </div>
      <div className="space-y-3">
        {STATS.map((s) => {
          const v = meta.statXp[s.key];
          const pct = Math.round((v / Math.max(500, v * 1.6)) * 100);
          return (
            <div key={s.key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-hand text-[19px]" style={{ color: s.color }}>
                  {s.label}
                </span>
                <span className="text-[11px] font-semibold text-ink-soft">{v} XP</span>
              </div>
              <div className="h-5 rounded-full border-2 overflow-hidden relative" style={{ borderColor: s.color + '88', background: 'rgba(255,255,255,0.4)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${s.color}aa, ${s.color})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[98%] h-1.5 rounded-full bg-white/40" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-ink/10 bg-white/30 py-2.5">
          <div className="text-lg font-bold text-accent-red">{level}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-faint">Level</div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white/30 py-2.5">
          <div className="text-lg font-bold text-accent-blue">{meta.habitCompletions}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-faint">Habits completed</div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white/30 py-2.5">
          <div className="text-lg font-bold text-accent-amber">{meta.perfectDays}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-faint">Perfect days</div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white/30 py-2.5">
          <div className="text-lg font-bold text-accent-purple">{meta.ink}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-faint">INK</div>
        </div>
      </div>
      <div className="mt-4 text-[11px] text-ink-faint italic font-hand text-[15px] text-center">
        “Every habit feeds a stat. A balanced soul grows four.”
      </div>
    </PaperModal>
  );
}

// ---------------- achievements ----------------
export function AchievementsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const unlocked = state.snap.meta.achievements;
  return (
    <PaperModal open={open} onClose={onClose} title={<>Sticker wall — <span className="text-accent-red">{unlocked.length}/{ACHIEVEMENTS.length}</span> collected</>} width={640}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {ACHIEVEMENTS.map((a, i) => {
          const got = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-xl border-2 p-3 text-center transition ${got ? 'paper-grid grain border-accent-red/40' : 'border-ink/10 bg-white/20 opacity-55 grayscale'}`}
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <div className={`text-3xl ${got ? 'animate-floaty' : ''}`}>{got ? a.emoji : '🔒'}</div>
              <div className="font-sans font-bold text-[12.5px] mt-1.5 leading-tight">{a.name}</div>
              <div className="text-[10.5px] text-ink-soft mt-0.5 leading-snug">{a.desc}</div>
              {got && <HandTag className="text-[13px] text-accent-red">✓ collected</HandTag>}
            </div>
          );
        })}
      </div>
    </PaperModal>
  );
}

// ---------------- daily missions ----------------
export function MissionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, todayDone, dueToday, overallStreak, comboMult: mult } = useApp();
  const today = todayISO();
  const habits = state.snap.habits;
  const done = habits.filter((h) => h.entries[today]);
  const perfect = dueToday > 0 && done.length >= dueToday;
  const topStreaks = habits
    .map((h) => ({ h, s: habitStreak(h, new Date()).current }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6);

  return (
    <PaperModal open={open} onClose={onClose} title={<>Today's missions — <span className="text-accent-red">{done.length}/{dueToday}</span></>} width={540}>
      <div className="rounded-xl paper-grid grain border-2 border-ink/15 p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="font-hand text-[20px] text-ink">Consistency streak</span>
          <span className="font-hand text-[24px] text-accent-red">🔥 {overallStreak} days</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-hand text-[18px] text-ink-soft">Combo multiplier</span>
          <span className={`text-sm font-bold ${mult > 1 ? 'text-accent-red' : 'text-ink-faint'}`}>×{mult.toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-1.5 mb-4">
        {habits.map((h) => {
          const m = h.entries[today];
          return (
            <div key={h.id} className="flex items-center gap-2.5 rounded-lg border border-ink/10 bg-white/30 px-3 py-2">
              <span className={`w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center ${m ? 'bg-accent-green border-accent-green' : 'border-ink/30'}`}>
                {m && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5 L4.8 9.2 L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`flex-1 text-sm ${m ? 'line-through text-ink-faint' : 'font-medium'}`}>{h.name}</span>
              <span className="text-[10px] text-ink-faint">{h.difficulty === 'easy' ? '+5' : h.difficulty === 'medium' ? '+15' : h.difficulty === 'hard' ? '+30' : '+50'} XP</span>
            </div>
          );
        })}
      </div>
      {perfect ? (
        <div className="rounded-xl border-2 border-accent-green/50 bg-accent-green/10 p-3 text-center animate-pop">
          <div className="font-hand text-2xl text-accent-green">PERFECT DAY! ☀️</div>
          <div className="text-xs text-ink-soft mt-0.5">+100 XP · +10 INK · +10 Discipline — claimed automatically</div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-ink/20 p-3 text-center text-xs text-ink-faint">
          Complete <b>every</b> habit today for <b>PERFECT DAY</b>: +100 XP · +10 INK · +10 Discipline
        </div>
      )}
      {topStreaks.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-1.5">Hottest streaks</div>
          <div className="flex flex-wrap gap-1.5">
            {topStreaks.map(({ h, s }) => (
              <span key={h.id} className="rounded-full border border-ink/15 px-2.5 py-1 text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                {h.name}
                {s > 0 && <b className="text-accent-red">🔥{s}</b>}
              </span>
            ))}
          </div>
        </div>
      )}
      <QuestsSection />
    </PaperModal>
  );
}

// ---------------- derived quests ----------------
function QuestsSection() {
  const { state } = useApp();
  const mk = monthKey(new Date());
  const quests = state.snap.habits
    .map((h) => {
      const done = Object.keys(h.entries).filter((k) => k.startsWith(mk)).length;
      const target = h.difficulty === 'easy' ? 20 : h.difficulty === 'medium' ? 15 : 10;
      return { h, done, target, pct: Math.min(100, Math.round((done / target) * 100)) };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-1.5">⚔️ Quests — this month</div>
      <div className="space-y-2">
        {quests.map(({ h, done, target, pct }) => {
          const doneFlag = done >= target;
          return (
            <div key={h.id} className={`rounded-xl border-2 p-2.5 ${doneFlag ? 'border-accent-green/50 bg-accent-green/5' : 'border-ink/10 bg-white/25'}`}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                  {h.name}
                </span>
                {doneFlag ? (
                  <span className="font-hand text-[15px] text-accent-green">quest complete! +50 XP</span>
                ) : (
                  <span className="text-[11px] text-ink-faint tabular-nums">{done}/{target}</span>
                )}
              </div>
              <div className="mt-1.5 h-3 rounded-full border border-ink/15 overflow-hidden bg-white/30">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${doneFlag ? 'bg-accent-green' : ''}`}
                  style={{ width: `${pct}%`, background: doneFlag ? undefined : `linear-gradient(90deg, ${h.color}77, ${h.color})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-ink-faint italic">Quests auto-track your monthly completions. Reward shown on completion.</div>
    </div>
  );
}

// ---------------- shop ----------------
export function ShopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, act } = useApp();
  const meta = state.snap.meta;
  return (
    <PaperModal open={open} onClose={onClose} title={<>Ink shop — <span className="text-accent-red">{meta.ink} 🖋️</span></>} width={600}>
      <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-2">Notebook covers</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {SHOP_ITEMS.filter((i) => i.kind === 'cover').map((it) => (
          <ShopCard key={it.id} it={it} owned={meta.unlocked.includes(it.id)} ink={meta.ink} onBuy={() => act.spend(it.price, it.id)} />
        ))}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-2">Premium inks</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SHOP_ITEMS.filter((i) => i.kind === 'ink').map((it) => (
          <ShopCard key={it.id} it={it} owned={meta.unlocked.includes(it.id)} ink={meta.ink} onBuy={() => act.spend(it.price, it.id)} />
        ))}
      </div>
      <div className="mt-4 text-[11px] text-ink-faint">
        🖋️ Earn INK by completing habits (+2 each) and perfect days (+10). Everything here is cosmetic — your notebook always stays free.
      </div>
    </PaperModal>
  );
}

function ShopCard({ it, owned, ink, onBuy }: { it: (typeof SHOP_ITEMS)[number]; owned: boolean; ink: number; onBuy: () => void }) {
  const [flash, setFlash] = useState(false);
  const buy = () => {
    if (owned || ink < it.price) return;
    onBuy();
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };
  return (
    <div
      className={`rounded-xl border-2 p-2.5 text-center transition ${owned ? 'border-accent-green/50 bg-accent-green/5' : 'border-ink/15 bg-white/30'} ${flash ? 'animate-pop' : ''}`}
    >
      <div className="text-2xl">{it.emoji}</div>
      <div className="font-sans font-bold text-[12px] mt-1 leading-tight">{it.name}</div>
      <div className="text-[10px] text-ink-faint mt-0.5 leading-snug">{it.desc}</div>
      {it.kind === 'ink' && (
        <div className="mx-auto mt-1 w-6 h-3 rounded-full border border-ink/20" style={{ background: it.value }} />
      )}
      <button
        onClick={buy}
        disabled={owned}
        className={`mt-2 w-full rounded-lg py-1 text-[11px] font-bold transition ${
          owned ? 'bg-accent-green/15 text-accent-green' : ink >= it.price ? 'bg-ink text-paper hover:bg-ink/85' : 'bg-ink/10 text-ink-faint cursor-not-allowed'
        }`}
      >
        {owned ? '✓ Owned' : `Buy · ${it.price} 🖋️`}
      </button>
    </div>
  );
}
