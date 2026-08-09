import React from 'react';
import { useApp } from '../../state/AppContext';
import { PaperModal } from '../ui';
import { DIFF_XP, RIVALS, habitStreak, levelFromXp, rivalWeeklyXp, weeklyXp } from '../../lib/gamify';
import { lastNDays, todayISO } from '../../lib/dates';

const WIN_CRITERIA: { emoji: string; title: string; desc: string }[] = [
  { emoji: '☀️', title: 'Win a Day', desc: 'Complete every habit in one day — the Perfect Day bonus (+100 XP) claims itself.' },
  { emoji: '🌟', title: 'Win a Week', desc: 'Rack up 7 perfect days in a row — unlock the Perfect Week sticker.' },
  { emoji: '🔥', title: 'Win a Streak', desc: 'Keep any habit alive for 30 days (then 60 → Marathoner).' },
  { emoji: '🥇', title: 'Win the League', desc: 'Climb to rank #1 on this week’s leaderboard.' },
  { emoji: '🏆', title: 'Win the Game', desc: 'Reach level 12 (Notebook Master) and collect every sticker on the wall.' }
];

export default function LeaderboardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const habits = state.snap.habits;
  const now = new Date();
  const today = todayISO();

  const myWeekly = weeklyXp(habits, now);
  const rows = [
    { name: 'You', emoji: '🦉', color: '#2c2a26', xp: myWeekly, you: true, streak: 0 },
    ...RIVALS.map((r, i) => ({ name: r.name, emoji: r.emoji, color: r.color, xp: rivalWeeklyXp(r.base, i, now), you: false }))
  ].sort((a, b) => b.xp - a.xp);
  const myRank = rows.findIndex((r) => r.you) + 1;
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`);

  const habitRows = habits
    .map((h) => {
      const s = habitStreak(h, now);
      const weekDone = lastNDays(7).filter((d) => h.entries[d]).length;
      return { h, total: Object.keys(h.entries).length, streak: s.current, weekDone };
    })
    .sort((a, b) => b.total - a.total);

  const level = levelFromXp(state.snap.meta.xp);

  return (
    <PaperModal open={open} onClose={onClose} title={<>Weekly league — <span className="text-accent-red">gamify your life</span></>} width={620}>
      {/* league table */}
      <div className="rounded-xl border border-ink/15 overflow-hidden">
        <div className="bg-ink text-paper px-3 py-2 text-[11px] font-bold uppercase tracking-widest flex items-center justify-between">
          <span>This week’s XP ladder</span>
          <span className="font-normal normal-case tracking-normal text-paper/60">resets every week · your rank #{myRank}</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            className={`flex items-center gap-2.5 px-3 py-2 border-b border-ink/5 last:border-b-0 ${r.you ? 'bg-accent-red/10' : 'bg-white/20'}`}
          >
            <span className="w-7 text-center text-[13px] font-bold tabular-nums">{medal(rows.indexOf(r) + 1)}</span>
            <span className="text-lg leading-none">{r.emoji}</span>
            <span className={`flex-1 text-[13px] font-semibold ${r.you ? 'text-accent-red' : ''}`}>
              {r.name}
              {r.you && <span className="ml-1.5 text-[10px] font-bold text-accent-red">(you)</span>}
            </span>
            <span className="text-[12px] font-bold tabular-nums">{r.xp} XP</span>
            <div className="w-24 h-2 rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (r.xp / Math.max(1, rows[0].xp)) * 100)}%`,
                  background: r.you ? '#c0392b' : r.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {myRank === 1 && (
        <div className="mt-2 rounded-xl border-2 border-accent-amber/60 bg-accent-amber/10 px-3 py-2 text-[12px] font-semibold text-center">
          🥇 You’re #1 this week — keep it up, the rivals are right behind you!
        </div>
      )}

      {/* habit rankings */}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-1.5">📈 Your habits — ranked</div>
        {habitRows.length === 0 ? (
          <div className="text-xs text-ink-faint italic">Create a habit to start climbing the board.</div>
        ) : (
          <div className="space-y-1.5">
            {habitRows.map(({ h, total, streak, weekDone }, i) => (
              <div key={h.id} className="flex items-center gap-2.5 rounded-lg border border-ink/10 bg-white/30 px-3 py-2">
                <span className="w-5 text-center text-[12px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: h.color }} />
                <span className="flex-1 truncate text-[13px] font-medium">{h.name}</span>
                <span className="hidden sm:inline text-[10px] text-ink-faint tabular-nums">{weekDone}/7 this week</span>
                <span className="text-[10px] font-bold text-accent-red tabular-nums">{streak > 0 ? `🔥${streak}` : '—'}</span>
                <span className="text-[11px] font-semibold text-ink-soft tabular-nums w-16 text-right">{total} total</span>
                <span className="text-[10px] text-ink-faint tabular-nums w-10 text-right">+{total * DIFF_XP[h.difficulty]} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* win criteria */}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-1.5">🏆 How to win InkQuest</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WIN_CRITERIA.map((w) => (
            <div key={w.title} className="rounded-xl border-2 border-ink/10 bg-white/25 p-2.5">
              <div className="flex items-center gap-1.5 text-[13px] font-bold">
                <span>{w.emoji}</span>
                {w.title}
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5 leading-snug">{w.desc}</div>
            </div>
          ))}
          <div className="rounded-xl border-2 border-dashed border-ink/15 bg-white/10 p-2.5 flex flex-col justify-center">
            <div className="text-[12px] font-bold flex items-center gap-1.5">
              <span>📊</span> Current status
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5 leading-snug">
              Level <b>{level}</b> · <b>{rows[0]?.xp ?? 0}</b> top weekly XP · today: <b>{habits.filter((h) => h.entries[today]).length}/{habits.length}</b> done
            </div>
          </div>
        </div>
      </div>
    </PaperModal>
  );
}
