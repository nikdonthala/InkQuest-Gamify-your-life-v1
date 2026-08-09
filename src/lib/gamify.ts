// ---- gamification engine: XP, levels, streaks, combos, achievements ----
import type { Difficulty, Habit, Mark, Meta, StatKey } from '../types';
import { iso, addDays } from './dates';

export const DIFF_XP: Record<Difficulty, number> = { easy: 5, medium: 15, hard: 30, goal: 50 };

/** cumulative XP required to REACH a level (level 1 = 0) */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return xpForLevel(level - 1) + 100 + 40 * (level - 2);
}

export function levelFromXp(xp: number): number {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const cur = xp - xpForLevel(level);
  const need = xpForLevel(level + 1) - xpForLevel(level);
  return { level, cur, need, pct: Math.min(100, Math.round((cur / need) * 100)) };
}

/** combo multiplier based on consecutive-days overall streak */
export function comboMult(streak: number): number {
  if (streak >= 30) return 2;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1;
}

/** consecutive days with a mark, ending today or yesterday */
export function habitStreak(habit: Habit, end: Date): { current: number; best: number } {
  let best = 0;
  let run = 0;
  // walk backwards from the end date
  const walk = (from: Date, allowGap: boolean) => {
    let cur = 0;
    let d = new Date(from);
    for (let i = 0; i < 730; i++) {
      if (habit.entries[iso(d)]) cur++;
      else if (i === 0 && allowGap) {
        // yesterday gap is allowed
      } else break;
      d = addDays(d, -1);
    }
    return cur;
  };
  let current = 0;
  if (habit.entries[iso(end)]) {
    current = walk(end, false);
  } else {
    // allow a one-day grace
    const y = addDays(end, -1);
    if (habit.entries[iso(y)]) current = walk(y, false);
  }
  // best over all time
  const keys = Object.keys(habit.entries).sort();
  for (const k of keys) {
    run = habit.entries[k] ? run + 1 : 0;
    best = Math.max(best, run);
  }
  if (!keys.length) best = current;
  return { current, best };
}

/** overall streak: consecutive days with at least one completion */
export function overallStreak(habits: Habit[], end: Date): number {
  let streak = 0;
  let d = new Date(end);
  const hasDay = (day: Date) => {
    const k = iso(day);
    return habits.some((h) => h.entries[k]);
  };
  // allow today-or-yesterday start
  if (!hasDay(d)) d = addDays(d, -1);
  for (let i = 0; i < 730; i++) {
    if (hasDay(d)) streak++;
    else break;
    d = addDays(d, -1);
  }
  return streak;
}

export const dayCompletions = (habits: Habit[], dateISO: string) =>
  habits.filter((h) => h.entries[dateISO]).length;

export const totalCompletions = (habits: Habit[]) =>
  habits.reduce((acc, h) => acc + Object.keys(h.entries).length, 0);

export const xpFromEntries = (habits: Habit[]) =>
  habits.reduce((acc, h) => {
    const n = Object.keys(h.entries).length;
    return acc + n * DIFF_XP[h.difficulty];
  }, 0);

/** every habit completed on that day */
export const perfectDay = (habits: Habit[], dateISO: string) =>
  habits.length > 0 && habits.every((h) => h.entries[dateISO]);

/** consecutive perfect days ending today (or yesterday if today isn't finished yet) */
export function perfectWeek(habits: Habit[], end: Date): number {
  let n = 0;
  let d = new Date(end);
  if (!perfectDay(habits, iso(d))) d = addDays(d, -1);
  for (let i = 0; i < 30; i++) {
    if (perfectDay(habits, iso(d))) {
      n++;
      d = addDays(d, -1);
    } else break;
  }
  return n;
}

/** XP earned in the last 7 days */
export function weeklyXp(habits: Habit[], end: Date): number {
  let xp = 0;
  for (let i = 0; i < 7; i++) {
    const k = iso(addDays(end, -i));
    for (const h of habits) if (h.entries[k]) xp += DIFF_XP[h.difficulty];
  }
  return xp;
}

// ---- weekly league rivals (deterministic per ISO week so scores change weekly) ----
export interface Rival {
  name: string;
  emoji: string;
  color: string;
  base: number;
}

export const RIVALS: Rival[] = [
  { name: 'Riya', emoji: '🦊', color: '#c0392b', base: 130 },
  { name: 'Sam', emoji: '🐼', color: '#3b6ea5', base: 118 },
  { name: 'Leo', emoji: '🦁', color: '#b7791f', base: 104 },
  { name: 'Mia', emoji: '🐱', color: '#7c5cbf', base: 92 },
  { name: 'Noah', emoji: '🐸', color: '#3c7a4f', base: 82 },
  { name: 'Zoe', emoji: '🐰', color: '#c2547e', base: 68 },
  { name: 'Kai', emoji: '🐢', color: '#16a085', base: 55 }
];

const weekIndex = (d: Date) => Math.floor(d.getTime() / (7 * 86400000));

export function rivalWeeklyXp(base: number, idx: number, week: Date): number {
  const wk = weekIndex(week);
  return base + ((wk * 13 + idx * 7) % 30);
}

/** true when your weekly XP beats every rival */
export function topOfLeague(habits: Habit[], week: Date): boolean {
  const me = weeklyXp(habits, week);
  return RIVALS.every((r, i) => me > rivalWeeklyXp(r.base, i, week));
}

// ---- achievements ----

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  cond: (ctx: AchCtx) => boolean;
}

export interface AchCtx {
  habits: Habit[];
  meta: Meta;
  level: number;
  bestStreak: number;
  todayDone: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: 'First Step', desc: 'Complete your first habit', emoji: '🪶', cond: (c) => totalCompletions(c.habits) >= 1 },
  { id: 'doodle', name: 'Doodlebug', desc: 'Add your first drawing', emoji: '✏️', cond: (c) => c.meta.habitCompletions >= 3 },
  { id: 'week-warrior', name: 'Week Warrior', desc: '7-day streak on any habit', emoji: '🔥', cond: (c) => c.bestStreak >= 7 },
  { id: 'unstoppable', name: 'Unstoppable', desc: '30-day streak on any habit', emoji: '⚡', cond: (c) => c.bestStreak >= 30 },
  { id: 'builder', name: 'Habit Builder', desc: 'Create 5 habits', emoji: '🌱', cond: (c) => c.habits.length >= 5 },
  { id: 'perfect-day', name: 'Perfect Day', desc: 'Complete every planned habit in a day', emoji: '☀️', cond: (c) => c.todayDone && c.meta.perfectDays >= 1 },
  { id: 'level-5', name: 'Journeyman', desc: 'Reach level 5', emoji: '🎓', cond: (c) => c.level >= 5 },
  { id: 'level-10', name: 'Legend in the Making', desc: 'Reach level 10', emoji: '👑', cond: (c) => c.level >= 10 },
  { id: 'scholar', name: 'Scholar', desc: '1,000 Knowledge XP', emoji: '📚', cond: (c) => c.meta.statXp.knowledge >= 1000 },
  { id: 'strong', name: 'Iron Will', desc: '500 Discipline XP', emoji: '🏋️', cond: (c) => c.meta.statXp.discipline >= 500 },
  { id: 'ink-hoarder', name: 'Ink Hoarder', desc: 'Earn 500 INK', emoji: '🖋️', cond: (c) => c.meta.ink >= 500 },
  { id: 'century', name: 'Century', desc: '100 total habit completions', emoji: '💯', cond: (c) => totalCompletions(c.habits) >= 100 },
  { id: 'balanced', name: 'Balanced Soul', desc: 'Grow 4 different stats', emoji: '⚖️', cond: (c) => Object.values(c.meta.statXp).filter((v) => v >= 150).length >= 4 },
  { id: 'early', name: 'Morning Ink', desc: 'Complete a habit before 8 AM', emoji: '🌅', cond: (c) => c.todayDone && new Date().getHours() < 8 },
  { id: 'perfect-week', name: 'Perfect Week', desc: '7 perfect days in a row', emoji: '🌟', cond: (c) => perfectWeek(c.habits, new Date()) >= 7 },
  { id: 'streak-60', name: 'Marathoner', desc: '60-day streak on any habit', emoji: '🏅', cond: (c) => c.bestStreak >= 60 },
  { id: 'league-winner', name: 'League Champion', desc: 'Top the weekly leaderboard', emoji: '🥇', cond: (c) => topOfLeague(c.habits, new Date()) },
  { id: 'level-12', name: 'Notebook Master', desc: 'Reach level 12', emoji: '🏆', cond: (c) => c.level >= 12 }
];

export function checkAchievements(ctx: AchCtx, unlocked: string[]): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.includes(a.id) && a.cond(ctx)) fresh.push(a.id);
  }
  return fresh;
}

// ---- pet ----
export function petStageForLevel(level: number): number {
  if (level >= 12) return 3;
  if (level >= 5) return 2;
  return 1;
}
