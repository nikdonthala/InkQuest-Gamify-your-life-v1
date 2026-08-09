import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { dayCompletions, habitStreak, levelFromXp } from '../../lib/gamify';
import { daysInMonth, iso, lastNDays, MONTH_NAMES, monthKey, todayISO } from '../../lib/dates';
import { HandTag } from '../ui';

const jitter = (i: number, amt = 3) => (((i * 7919) % 101) / 101 - 0.5) * amt;

export default function AnalyticsView({ onClose }: { onClose: () => void }) {
  const { state, bestStreak, level } = useApp();
  const habits = state.snap.habits;
  const meta = state.snap.meta;

  const chart = useMemo(() => {
    const days = lastNDays(30);
    const counts = days.map((d) => dayCompletions(habits, d));
    const W = 640;
    const H = 190;
    const pad = { l: 40, r: 16, t: 18, b: 30 };
    const max = Math.max(3, ...counts);
    const pts = counts.map((c, i) => ({
      x: pad.l + (i / (days.length - 1)) * (W - pad.l - pad.r),
      y: pad.t + (H - pad.t - pad.b) * (1 - c / max) + jitter(i, 4)
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${mx} ${(pts[i - 1].y + pts[i].y) / 2}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    const area = `${d} L ${pts[pts.length - 1].x} ${H - pad.b} L ${pts[0].x} ${H - pad.b} Z`;
    return { pts, d, area, W, H, pad, days, counts };
  }, [habits]);

  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const heat = useMemo(() => {
    const rows: { label: string; counts: number[] }[] = [];
    for (let mo = 0; mo < 12; mo++) {
      const dim = daysInMonth(year, mo);
      const row: number[] = [];
      for (let d = 1; d <= dim; d++) {
        const k = iso(new Date(year, mo, d));
        row.push(dayCompletions(habits, k));
      }
      rows.push({ label: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][mo], counts: row });
    }
    return rows;
  }, [habits, year]);

  const consistency = useMemo(
    () =>
      habits
        .map((h) => {
          const days = lastNDays(30);
          const done = days.filter((d) => h.entries[d]).length;
          return { h, pct: Math.round((done / 30) * 100) };
        })
        .sort((a, b) => b.pct - a.pct),
    [habits]
  );

  const monthKeyNow = monthKey(new Date());
  const completionsThisMonth = habits.reduce(
    (a, h) => a + Object.keys(h.entries).filter((k) => k.startsWith(monthKeyNow)).length,
    0
  );

  const heatColor = (n: number) => {
    if (n === 0) return 'rgba(44,42,38,0.10)';
    if (n === 1) return 'rgba(60,122,79,0.38)';
    if (n === 2) return 'rgba(60,122,79,0.6)';
    if (n === 3) return 'rgba(60,122,79,0.8)';
    return '#3c7a4f';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col bg-[#e9e2d0]"
    >
      <div className="flex items-center justify-between px-6 py-3 bg-[#2d2a26] text-paper">
        <div className="font-hand text-2xl">
          Analytics — <span className="text-accent-amber">written by hand</span>
        </div>
        <button onClick={onClose} className="rounded-lg bg-paper/10 hover:bg-paper/20 px-4 py-1.5 text-sm transition">
          ← back to notebook
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[980px] mx-auto space-y-6">
          {/* 30-day chart */}
          <section className="paper-grid grain rounded-2xl shadow-paper p-5 border border-ink/10">
            <div className="flex items-baseline justify-between mb-2">
              <HandTag className="text-2xl">Habits completed — last 30 days</HandTag>
              <span className="text-[11px] text-ink-faint">{chart.days[0]} → {chart.days[chart.days.length - 1]}</span>
            </div>
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full">
              <g stroke="#8a8378" strokeWidth="1" strokeDasharray="3 5" opacity="0.5">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1={chart.pad.l} x2={chart.W - chart.pad.r} y1={chart.pad.t + (chart.H - chart.pad.t - chart.pad.b) * f} y2={chart.pad.t + (chart.H - chart.pad.t - chart.pad.b) * f} />
                ))}
              </g>
              <path d={chart.area} fill="url(#inkgrad)" opacity="0.18" />
              <path d={chart.d} fill="none" stroke="#c0392b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {chart.pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.6" fill="#c0392b" stroke="#f6f1e5" strokeWidth="1.2" />
              ))}
              <line x1={chart.pad.l} x2={chart.pad.l} y1={chart.pad.t} y2={chart.H - chart.pad.b} stroke="#57524a" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.6" />
              <line x1={chart.pad.l} x2={chart.W - chart.pad.r} y1={chart.H - chart.pad.b} y2={chart.H - chart.pad.b} stroke="#57524a" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.6" />
              {[0, 14, 29].map((i) => (
                <text key={i} x={chart.pts[i].x} y={chart.H - 10} textAnchor="middle" fontSize="9" fill="#8a8378" fontFamily="'Google Sans', sans-serif">
                  {chart.days[i].slice(5)}
                </text>
              ))}
              <defs>
                <linearGradient id="inkgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c0392b" />
                  <stop offset="100%" stopColor="#c0392b" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </section>

          {/* year heatmap */}
          <section className="paper-grid grain rounded-2xl shadow-paper p-5 border border-ink/10">
            <HandTag className="text-2xl">Year in pixels — {year}</HandTag>
            <div className="mt-3 flex gap-2">
              <div className="flex flex-col gap-[2px] pr-1">
                {heat.map((r) => (
                  <div key={r.label} className="text-[9px] font-bold text-ink-faint flex items-center" style={{ height: 11 }}>
                    {r.label}
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex flex-col gap-[2px]" style={{ minWidth: 31 * 12 + 30 }}>
                  {heat.map((r, ri) => (
                    <div key={ri} className="flex gap-[2px]">
                      {Array.from({ length: 31 }, (_, d) => {
                        const c = d < r.counts.length ? r.counts[d] : 0;
                        const k = iso(new Date(year, ri, d + 1));
                        const isToday = k === todayISO();
                        return (
                          <div
                            key={d}
                            className="rounded-[2px] transition-transform hover:scale-125"
                            style={{ width: 11, height: 11, background: heatColor(c), outline: isToday ? '1.5px solid #c0392b' : 'none', outlineOffset: 1 }}
                            title={k}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-ink-faint">
              less
              {[0, 1, 2, 3, 5].map((n) => (
                <span key={n} className="w-3 h-3 rounded-[2px]" style={{ background: heatColor(n) }} />
              ))}
              more
            </div>
          </section>

          {/* monthly summary */}
          <section className="paper-grid grain rounded-2xl shadow-paper p-6 border border-ink/10 max-w-[560px]">
            <div className="text-center">
              <div className="font-hand text-3xl text-ink tracking-widest">
                {MONTH_NAMES[month].toUpperCase()} {year}
              </div>
              <div className="mx-auto mt-2 w-40 border-t-2 border-ink/30" style={{ transform: 'rotate(-0.5deg)' }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-hand text-[20px]">
              <div className="text-ink-soft">LEVEL</div>
              <div className="text-right text-ink font-semibold">{level}</div>
              <div className="text-ink-soft">TOTAL XP</div>
              <div className="text-right text-ink font-semibold">{meta.xp.toLocaleString()}</div>
              {Object.entries(meta.statXp).map(([k, v]) => (
                <React.Fragment key={k}>
                  <div className="text-ink-soft capitalize">{k}</div>
                  <div className="text-right">
                    <span className="inline-block h-[9px] rounded-sm align-middle mr-1" style={{ width: Math.min(90, Math.round((v / 400) * 90)), background: 'rgba(192,57,43,0.8)', transform: 'skewX(-8deg)' }} />
                    <span className="text-[15px] text-ink-soft">{v}</span>
                  </div>
                </React.Fragment>
              ))}
              <div className="text-ink-soft">🔥 BEST STREAK</div>
              <div className="text-right text-ink font-semibold">{bestStreak} days</div>
              <div className="text-ink-soft">✅ HABITS THIS MONTH</div>
              <div className="text-right text-ink font-semibold">{completionsThisMonth}</div>
              <div className="text-ink-soft">☀️ PERFECT DAYS</div>
              <div className="text-right text-ink font-semibold">{meta.perfectDays}</div>
              <div className="text-ink-soft">🏆 ACHIEVEMENTS</div>
              <div className="text-right text-ink font-semibold">{meta.achievements.length}</div>
            </div>
            <div className="mt-4 text-center">
              <HandTag className="text-accent-red text-xl">— page {month + 1} of your life —</HandTag>
            </div>
          </section>

          {/* consistency */}
          <section className="paper-grid grain rounded-2xl shadow-paper p-5 border border-ink/10">
            <HandTag className="text-2xl">30-day consistency</HandTag>
            <div className="mt-3 space-y-2">
              {consistency.map(({ h, pct }) => (
                <div key={h.id} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} />
                  <span className="w-40 truncate text-sm">{h.name}</span>
                  <div className="flex-1 h-4 rounded-full border border-ink/15 bg-white/30 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${h.color}88, ${h.color})`, transform: 'skewX(-6deg)' }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-ink-soft">{pct}%</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
