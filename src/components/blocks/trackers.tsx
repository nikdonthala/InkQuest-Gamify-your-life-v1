import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Block, Habit, Mark, TableColumn } from '../../types';
import { MARKS } from '../../types';
import { useApp } from '../../state/AppContext';
import { habitStreak } from '../../lib/gamify';
import { DAY_LETTERS, MONTH_SHORT, daysInMonth, iso, monthDates, monthGrid, monthKey, monthLabel, monthShortLabel, todayISO } from '../../lib/dates';
import { Tip } from '../ui';

// ---------------- mark glyphs ----------------
export function MarkGlyph({ mark, color = '#2c2a26', size = 16, className = '' }: { mark: Mark; color?: string; size?: number; className?: string }) {
  const s = {
    width: size,
    height: size,
    color,
    fill: 'none',
    stroke: color,
    strokeWidth: Math.max(1.6, size / 9),
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} style={{ overflow: 'visible' }}>
      {mark === 'x' && <path d="M5 5 L15 15 M15 5 L5 15" {...s} />}
      {mark === 'check' && <path d="M4 11 L8.5 15.5 L16 5.5" {...s} />}
      {mark === 'dot' && <circle cx="10" cy="10" r="4.2" fill={color} stroke="none" />}
      {mark === 'fill' && <rect x="3.5" y="3.5" width="13" height="13" rx="2" fill={color} stroke="none" />}
      {mark === 'diag' && <path d="M4 16 L16 4" {...s} />}
      {mark === 'star' && (
        <path
          d="M10 2.6 L12.1 7.2 L17 7.8 L13.5 11.1 L14.4 16 L10 13.5 L5.6 16 L6.5 11.1 L3 7.8 L7.9 7.2 Z"
          fill={color}
          stroke="none"
        />
      )}
      {mark === 'heart' && (
        <path
          d="M10 17 C10 17 3 12.5 3 8 C3 5.5 4.8 4 6.8 4 C8.3 4 9.5 4.8 10 6 C10.5 4.8 11.7 4 13.2 4 C15.2 4 17 5.5 17 8 C17 12.5 10 17 10 17 Z"
          fill={color}
          stroke="none"
        />
      )}
      {mark === 'tri' && <path d="M10 4.2 L17 16 H3 Z" {...s} />}
    </svg>
  );
}

// ---------------- stamp picker row ----------------
export function StampRow({
  value,
  onChange,
  color = '#2c2a26',
  size = 18,
  compact = false
}: {
  value: Mark;
  onChange: (m: Mark) => void;
  color?: string;
  size?: number;
  compact?: boolean;
}) {
  const btn = compact ? 'w-5 h-5' : 'w-7 h-7';
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-paper/90 border border-ink/15 shadow-paper-sm px-1 py-0.5">
      {MARKS.map((m) => (
        <button
          key={m}
          onClick={(e) => {
            e.stopPropagation();
            onChange(m);
          }}
          className={`${btn} rounded-md flex items-center justify-center transition hover:bg-ink/10 ${
            value === m ? 'bg-accent-red/15 ring-2 ring-accent-red/40' : ''
          }`}
          title={m}
        >
          <MarkGlyph mark={m} color={value === m ? '#c0392b' : color} size={size} />
        </button>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChange('x');
        }}
        className={`${btn} rounded-md flex items-center justify-center text-ink-faint hover:bg-ink/10 text-xs`}
        title="Default: cross"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------- painting hook ----------------
function usePainting(commit: (key: string) => void) {
  const painting = useRef(false);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    const stop = () => {
      painting.current = false;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);
  const cellProps = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      painting.current = true;
      commitRef.current(key);
    },
    onPointerEnter: () => {
      if (painting.current) commitRef.current(key);
    }
  });
  return { cellProps };
}

// ---------------- shared cell ----------------
function Cell({
  mark,
  color,
  size,
  today,
  preview,
  ...handlers
}: {
  mark: Mark | null;
  color: string;
  size: number;
  today?: boolean;
  preview?: Mark | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
}) {
  return (
    <div
      {...handlers}
      className={`cell-btn relative rounded-[3px] border flex items-center justify-center transition-colors ${
        today ? 'border-accent-red/60 bg-accent-red/5' : 'border-ink/15 hover:border-ink/40'
      }`}
      style={{ width: size, height: size }}
      title={today ? 'Today' : undefined}
    >
      {mark ? (
        <MarkGlyph mark={mark} color={color} size={size * 0.72} className="animate-pop" />
      ) : preview ? (
        <MarkGlyph mark={preview} color={color} size={size * 0.6} className="opacity-25" />
      ) : null}
    </div>
  );
}

// ---------------- habit link popover ----------------
export function HabitChip({ block, pageId, onLink }: { block: Block; pageId: string; onLink?: (habitId: string) => void }) {
  const { act, habitsById } = useApp();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const habit = block.habitId ? habitsById.get(block.habitId) : null;
  const streak = habit ? habitStreak(habit, new Date()).current : 0;
  const color = habit?.color ?? '#2c2a26';

  const link = (habitId: string) => (onLink ? onLink(habitId) : act.updateBlock(pageId, block.id, { habitId }));
  const unlink = () => (onLink ? onLink('') : act.updateBlock(pageId, block.id, { habitId: undefined }));

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold border transition"
        style={{ color, borderColor: color + '55', background: color + '0f' }}
      >
        {habit ? (
          <>
            <span className="max-w-[130px] truncate">{habit.name}</span>
            {streak > 0 && <span className="font-hand text-[14px]">🔥{streak}</span>}
          </>
        ) : (
          <span className="text-ink-faint italic font-normal">link habit…</span>
        )}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M1 2.5 L4 6 L7 2.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 w-52 rounded-lg bg-paper border border-ink/15 shadow-lift p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {habit && (
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs font-medium truncate">{habit.name}</span>
              <button onClick={unlink} className="text-[10px] text-accent-red hover:underline">
                unlink
              </button>
            </div>
          )}
          <div className="max-h-36 overflow-y-auto">
            {[...habitsById.values()].map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  link(h.id);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-ink/10 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                {h.name}
                {block.habitId === h.id && <span className="ml-auto text-accent-green">✓</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1 pt-1 border-t border-ink/10 mt-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  const h = act.addHabit({ name: newName.trim(), color, difficulty: 'medium', stat: 'discipline' });
                  link(h.id);
                  setNewName('');
                  setOpen(false);
                }
              }}
              placeholder="+ new habit"
              className="flex-1 text-xs bg-transparent border border-ink/15 rounded-md px-2 py-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- frame wrapper ----------------
export function TrackerFrame({
  block,
  pageId,
  children,
  habitColor,
  headerRight,
  labelEditable = true
}: {
  block: Block;
  pageId: string;
  children: React.ReactNode;
  habitColor: string;
  headerRight?: React.ReactNode;
  labelEditable?: boolean;
}) {
  const { act, habitsById } = useApp();
  const habit = block.habitId ? habitsById.get(block.habitId) : null;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(block.label ?? '');
  const color = habitColor;

  const commitLabel = () => {
    setEditing(false);
    const v = val.trim();
    if (!v || v === block.label) {
      setVal(block.label ?? '');
      return;
    }
    if (habit) act.updateHabit(habit.id, { name: v });
    act.updateBlock(pageId, block.id, { label: v });
  };

  return (
    <div
      className="absolute rounded-md border-2 pointer-events-auto select-none"
      style={{
        borderColor: color + '59',
        background: 'rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 1px 3px rgba(44,42,38,0.08)'
      }}
      data-block={block.id}
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-0.5 flex-wrap">
        {labelEditable && block.label !== undefined && (
          <div
            className="font-hand font-semibold text-[21px] leading-none whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            title="click to rename"
          >
            {editing ? (
              <input
                autoFocus
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabel();
                  e.stopPropagation();
                }}
                className="bg-transparent border-b border-ink/30 font-hand text-[19px] w-32"
                style={{ color }}
              />
            ) : (
              block.label
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">{headerRight}</div>
      </div>
      <div className="px-2 pb-2">{children}</div>
    </div>
  );
}

// ---------------- vertical tracker (days down, like the sketch) ----------------
export function VerticalTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act, habitsById } = useApp();
  const habit = block.habitId ? habitsById.get(block.habitId) : null;
  const [stamp, setStamp] = useState<Mark>('x');
  const color = habit?.color ?? block.color ?? '#2c2a26';
  const mk = monthKey(new Date());
  const dates = useMemo(() => monthDates(new Date().getFullYear(), new Date().getMonth()), [mk]);
  const cell = Math.min(15, Math.max(9, Math.floor((block.h - 44) / Math.max(dates.length, 1))));
  const today = todayISO();

  const commit = (key: string) => {
    if (habit) act.setHabitMark(habit.id, key, stamp);
    else act.setBlockMark(pageId, block.id, key, stamp);
  };
  const { cellProps } = usePainting(commit);

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={color}
      headerRight={
        <>
          <StampRow value={stamp} onChange={setStamp} color={color} size={14} />
          <HabitChip block={block} pageId={pageId} />
        </>
      }
    >
      <div className="flex flex-col gap-[3px] items-center">
        {dates.map((d, i) => (
          <div key={d.iso} className="flex items-center gap-1">
            <span className="text-[11px] text-ink-faint w-5 text-right font-medium tabular-nums">{d.day}</span>
            <Cell
              mark={habit ? (habit.entries[d.iso] ?? null) : (block.marks?.[d.iso] ?? null)}
              color={color}
              size={cell}
              today={d.iso === today}
              preview={undefined}
              {...cellProps(d.iso)}
            />
          </div>
        ))}
      </div>
    </TrackerFrame>
  );
}

// ---------------- horizontal tracker (days across, like the sketch) ----------------
export function HorizontalTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act, habitsById } = useApp();
  const habit = block.habitId ? habitsById.get(block.habitId) : null;
  const [stamp, setStamp] = useState<Mark>('x');
  const color = habit?.color ?? block.color ?? '#2c2a26';
  const mk = monthKey(new Date());
  const dates = useMemo(() => monthDates(new Date().getFullYear(), new Date().getMonth()), [mk]);
  const cell = Math.max(10, Math.min(18, Math.floor((block.w - 20) / dates.length)));
  const today = todayISO();
  const commit = (key: string) => {
    if (habit) act.setHabitMark(habit.id, key, stamp);
    else act.setBlockMark(pageId, block.id, key, stamp);
  };
  const { cellProps } = usePainting(commit);

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={color}
      headerRight={
        <>
          <StampRow value={stamp} onChange={setStamp} color={color} size={14} />
          <HabitChip block={block} pageId={pageId} />
        </>
      }
    >
      <div className="flex gap-[3px] flex-wrap items-center">
        {dates.map((d) => (
          <div key={d.iso} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-ink-faint font-medium tabular-nums">{d.day}</span>
            <Cell
              mark={habit ? (habit.entries[d.iso] ?? null) : (block.marks?.[d.iso] ?? null)}
              color={color}
              size={cell}
              today={d.iso === today}
              {...cellProps(d.iso)}
            />
          </div>
        ))}
      </div>
    </TrackerFrame>
  );
}

// ---------------- monthly boxes (2x2 mini grids, like the sketch) ----------------
export function BoxesTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act, habitsById } = useApp();
  const [stamp, setStamp] = useState<Mark>('x');
  const [month, setMonth] = useState<string>(block.month ?? monthKey(new Date()));
  const [y, m] = month.split('-').map(Number);
  // month key is 1-indexed ('2026-08'); monthDates needs 0-indexed
  const dates = useMemo(() => monthDates(y, m - 1), [y, m]);
  const boxes = block.boxes ?? [
    { label: 'A', habitId: block.habitId },
    { label: 'B' },
    { label: 'C' },
    { label: 'D' }
  ];
  const cell = Math.max(9, Math.min(14, Math.floor((block.w / 2 - 26) / 6)));
  const today = todayISO();

  const commit = (boxIdx: number, dateISO: string) => {
    const box = boxes[boxIdx];
    if (box?.habitId) act.setHabitMark(box.habitId, dateISO, stamp);
    else act.setBlockMark(pageId, block.id, `${boxIdx}:${dateISO}`, stamp);
  };
  const { cellProps } = usePainting((key) => {
    const [bi, di] = key.split(':');
    commit(Number(bi), di);
  });

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#2c2a26'}
      headerRight={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const d = new Date(y, m - 2, 1);
              const mk = monthKey(d);
              setMonth(mk);
              act.updateBlock(pageId, block.id, { month: mk });
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ‹
          </button>
          <span className="text-[12.5px] font-medium text-ink-soft">{monthShortLabel(month)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const d = new Date(y, m, 1);
              const mk = monthKey(d);
              setMonth(mk);
              act.updateBlock(pageId, block.id, { month: mk });
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ›
          </button>
          <StampRow value={stamp} onChange={setStamp} color="#2c2a26" size={13} />
        </>
      }
      labelEditable={false}
    >
      <div className="grid grid-cols-2 gap-2">
        {boxes.map((box, bi) => {
          const habit = box.habitId ? habitsById.get(box.habitId) : null;
          const color = habit?.color ?? '#2c2a26';
          return (
            <div key={bi} className="rounded-md border border-ink/15 bg-white/20 p-1.5">
              <div className="flex items-center justify-between">
                <div
                  className="font-hand font-semibold text-[17px] leading-none truncate max-w-[120px]"
                  style={{ color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!habit) {
                      const name = prompt('Box label', box.label);
                      if (name) act.updateBlock(pageId, block.id, { boxes: boxes.map((bx, i) => (i === bi ? { ...bx, label: name } : bx)) });
                    } else if (habit) {
                      const name = prompt('Rename habit', habit.name);
                      if (name) act.updateHabit(habit.id, { name });
                    }
                  }}
                >
                  {habit?.name ?? box.label}
                </div>
                <HabitChip
                  block={{ ...block, habitId: box.habitId, label: box.label }}
                  pageId={pageId}
                  onLink={(id) =>
                    act.updateBlock(pageId, block.id, {
                      boxes: boxes.map((bx, i) => (i === bi ? { ...bx, habitId: id || undefined } : bx))
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-6 gap-[3px] mt-1">
                {dates.map((d) => (
                  <Cell
                    key={d.iso}
                    mark={habit ? (habit.entries[d.iso] ?? null) : (block.marks?.[`${bi}:${d.iso}`] ?? null)}
                    color={color}
                    size={cell}
                    today={d.iso === today}
                    {...cellProps(`${bi}:${d.iso}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TrackerFrame>
  );
}

// ---------------- mini calendar ----------------
export function CalendarTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act } = useApp();
  const [stamp, setStamp] = useState<Mark>('star');
  const [month, setMonth] = useState<string>(block.month ?? monthKey(new Date()));
  const [y, m] = month.split('-').map(Number);
  // month key is 1-indexed ('2026-08'); monthGrid needs 0-indexed
  const cells = monthGrid(y, m - 1);
  const today = todayISO();
  const cell = Math.max(20, Math.min(30, Math.floor(Math.min(block.w - 20, block.h - 52) / 7.6)));

  const { cellProps } = usePainting((key) => {
    act.setBlockMark(pageId, block.id, key, stamp);
  });

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#2c2a26'}
      headerRight={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const d = new Date(y, m - 2, 1);
              const mk = monthKey(d);
              setMonth(mk);
              act.updateBlock(pageId, block.id, { month: mk });
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ‹
          </button>
          <span className="text-[12.5px] font-medium text-ink-soft min-w-[66px] text-center">{monthShortLabel(month)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const d = new Date(y, m, 1);
              const mk = monthKey(d);
              setMonth(mk);
              act.updateBlock(pageId, block.id, { month: mk });
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ›
          </button>
          <StampRow value={stamp} onChange={setStamp} color="#2c2a26" size={13} />
        </>
      }
      labelEditable={false}
    >
      <div className="grid grid-cols-7 gap-[3px]" style={{ width: cell * 7 + 18 }}>
        {DAY_LETTERS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-bold text-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c.inMonth ? (
            <div key={i} className="flex flex-col items-center">
              <Cell
                mark={block.marks?.[c.iso] ?? null}
                color={block.color ?? '#c0392b'}
                size={cell}
                today={c.iso === today}
                {...cellProps(c.iso)}
              />
              <span className={`text-[10px] leading-none mt-0.5 tabular-nums ${c.iso === today ? 'text-accent-red font-bold' : 'text-ink-faint'}`}>
                {c.day}
              </span>
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </TrackerFrame>
  );
}

// ---------------- google-calendar-style month view ----------------
export function GCalTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act } = useApp();
  const [stamp, setStamp] = useState<Mark>('star');
  const [month, setMonth] = useState<string>(block.month ?? monthKey(new Date()));
  const [y, m] = month.split('-').map(Number);
  // month key is 1-indexed ('2026-08'); monthGrid needs 0-indexed
  const cells = monthGrid(y, m - 1);
  const today = todayISO();
  const s = Math.floor(Math.min(block.w - 16, block.h - 92) / 7);

  const { cellProps } = usePainting((key) => {
    act.setBlockMark(pageId, block.id, key, stamp);
  });

  const nav = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    const mk = monthKey(d);
    setMonth(mk);
    act.updateBlock(pageId, block.id, { month: mk });
  };

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#3b6ea5'}
      headerRight={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nav(-1);
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const mk = monthKey(new Date());
              setMonth(mk);
              act.updateBlock(pageId, block.id, { month: mk });
            }}
            className="rounded-md border border-ink/20 text-[11px] px-2 py-0.5 text-ink-soft hover:bg-ink/5 transition"
          >
            Today
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nav(1);
            }}
            className="text-ink-soft hover:text-ink text-xs px-1"
          >
            ›
          </button>
          <span className="text-[13.5px] font-semibold text-ink min-w-[80px] text-center">{monthLabel(month)}</span>
          <StampRow value={stamp} onChange={setStamp} color="#3b6ea5" size={11} compact />
        </>
      }
      labelEditable={false}
    >
      <div style={{ width: s * 7 + 12 }}>
        <div className="grid grid-cols-7 gap-[2px] mb-[2px]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div
              key={i}
              className="text-center text-[11px] font-semibold uppercase tracking-wide py-0.5"
              style={{ color: i === 0 ? '#c0392b' : '#8a8378', width: s }}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {cells.map((c, i) =>
            c.inMonth ? (
              <div
                key={i}
                {...cellProps(c.iso)}
                className="relative rounded-[4px] border transition-colors select-none"
                style={{
                  width: s,
                  height: s,
                  borderColor: c.iso === today ? 'rgba(59,110,165,0.5)' : 'rgba(44,42,38,0.10)',
                  background: c.iso === today ? 'rgba(59,110,165,0.06)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <span
                  className={`absolute left-1 top-0.5 text-[13px] font-medium tabular-nums ${
                    c.iso === today ? 'bg-accent-blue text-white w-[20px] h-[20px] rounded-full flex items-center justify-center font-semibold' : c.weekday === 0 ? 'text-accent-red/80' : 'text-ink/70'
                  }`}
                >
                  {c.day}
                </span>
                {block.marks?.[c.iso] ? (
                  <span
                    className="absolute left-1 right-1 bottom-1 rounded-full h-[5px]"
                    style={{ background: block.color ?? '#3b6ea5', opacity: 0.85 }}
                  />
                ) : null}
              </div>
            ) : (
              <div key={i} style={{ width: s, height: s }} />
            )
          )}
        </div>
      </div>
    </TrackerFrame>
  );
}

// ---------------- weekly strip ----------------
export function WeeklyTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act } = useApp();
  const [stamp, setStamp] = useState<Mark>('check');
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const cell = 32;
  const { cellProps } = usePainting((key) => {
    act.setBlockMark(pageId, block.id, key, stamp);
  });

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#2c2a26'}
      headerRight={<StampRow value={stamp} onChange={setStamp} color="#2c2a26" size={14} />}
      labelEditable={false}
    >
      <div className="flex items-center gap-1.5">
        {block.label && (            <div className="font-hand font-semibold text-[18px]" style={{ color: block.color ?? '#2c2a26' }}>
            {block.label}
          </div>
        )}
        {dates.map((d, i) => {
          const k = String(i);
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className={`text-[12px] font-bold ${isToday ? 'text-accent-red' : 'text-ink-faint'}`}>{DAY_LETTERS[d.getDay()]}</span>
              <Cell
                mark={block.marks?.[k] ?? null}
                color={block.color ?? '#2c2a26'}
                size={cell}
                today={isToday}
                {...cellProps(k)}
              />
            </div>
          );
        })}
      </div>
    </TrackerFrame>
  );
}

// ---------------- straight habit table (days down, habits across) ----------------
export function TableTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act, habitsById } = useApp();
  const [stamp, setStamp] = useState<Mark>('check');
  const [month, setMonth] = useState<string>(block.month ?? monthKey(new Date()));
  const [y, m] = month.split('-').map(Number);
  const dates = useMemo(() => monthDates(y, m - 1), [y, m]);
  const today = todayISO();
  const columns = block.columns ?? [];
  // rows: header + days; size each day-row to fill the block height
  // keep the whole table (header + all day rows + frame chrome ≈ 108px) inside the block
  const rowH = Math.max(10, Math.min(18, Math.floor((block.h - 108) / Math.max(dates.length, 1))));
  const colW = Math.max(56, Math.floor((block.w - 44 - 28) / Math.max(columns.length, 1)));

  const commit = (key: string) => {
    const [ci, dateISO] = key.split(':');
    const col = columns[Number(ci)];
    if (col?.habitId) act.setHabitMark(col.habitId, dateISO, stamp);
    else act.setBlockMark(pageId, block.id, key, stamp);
  };
  const { cellProps } = usePainting(commit);

  const nav = (d: number) => {
    const mk = monthKey(new Date(y, m - 1 + d, 1));
    setMonth(mk);
    act.updateBlock(pageId, block.id, { month: mk });
  };
  const setCol = (ci: number, patch: Partial<TableColumn>) =>
    act.updateBlock(pageId, block.id, { columns: columns.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#2c2a26'}
      headerRight={
        <>
          <button onClick={(e) => { e.stopPropagation(); nav(-1); }} className="text-ink-soft hover:text-ink text-xs px-1" title="Previous month">‹</button>
          <span className="text-[12px] font-semibold text-ink-soft min-w-[64px] text-center tabular-nums">{monthShortLabel(month)}</span>
          <button onClick={(e) => { e.stopPropagation(); nav(1); }} className="text-ink-soft hover:text-ink text-xs px-1" title="Next month">›</button>
          <StampRow value={stamp} onChange={setStamp} color="#2c2a26" size={12} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              act.updateBlock(pageId, block.id, { columns: [...columns, { label: `Habit ${columns.length + 1}` }] });
            }}
            className="text-[11px] font-semibold text-ink-soft hover:text-accent-red px-1"
            title="Add a habit column"
          >
            + col
          </button>
        </>
      }
      labelEditable={false}
    >
      <div className="flex flex-col rounded-md border border-ink/25 overflow-hidden" style={{ width: 28 + columns.length * colW }}>
        {/* header row */}
        <div className="flex bg-ink/5 border-b border-ink/25">
          <div className="w-[28px] shrink-0 flex items-center justify-center text-[10px] font-bold text-ink-faint">#</div>
          {columns.map((col, ci) => {
            const habit = col.habitId ? habitsById.get(col.habitId) : null;
            return (
              <div key={ci} className="flex items-center justify-center border-l border-ink/15 px-1 min-w-0" style={{ width: colW }}>
                <HabitChip
                  block={{ ...block, habitId: col.habitId, label: col.label }}
                  pageId={pageId}
                  onLink={(id) => setCol(ci, { habitId: id || undefined })}
                />
              </div>
            );
          })}
        </div>
        {/* day rows */}
        {dates.map((d) => (
          <div key={d.iso} className="flex border-b border-ink/10 last:border-b-0">
            <div className={`w-[28px] shrink-0 flex items-center justify-center text-[10px] font-medium tabular-nums ${d.iso === today ? 'text-accent-red font-bold' : 'text-ink-faint'}`}>
              {d.day}
            </div>
            {columns.map((col, ci) => {
              const habit = col.habitId ? habitsById.get(col.habitId) : null;
              const color = habit?.color ?? '#2c2a26';
              const key = `${ci}:${d.iso}`;
              const mark = habit ? (habit.entries[d.iso] ?? null) : (block.marks?.[key] ?? null);
              return (
                <div
                  key={ci}
                  className="flex items-center justify-center border-l border-ink/10"
                  style={{ width: colW, height: rowH }}
                >
                  <div
                    {...cellProps(key)}
                    className={`flex items-center justify-center rounded-[3px] border transition-colors ${d.iso === today ? 'border-accent-red/60 bg-accent-red/5' : 'border-ink/15 hover:border-ink/40'}`}
                    style={{ width: rowH, height: rowH }}
                    title={d.iso === today ? 'Today' : undefined}
                  >
                    {mark && <MarkGlyph mark={mark} color={color} size={rowH * 0.72} />}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {columns.length === 0 && (
        <div className="text-[11px] text-ink-faint italic mt-1">Add a column with “+ col” to track a habit.</div>
      )}
    </TrackerFrame>
  );
}

// ---------------- year in pixels: a straight box grid — dates across the top, months down the side ----------------
export function YearTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act, habitsById } = useApp();
  const [stamp, setStamp] = useState<Mark>('fill');
  const habit = block.habitId ? habitsById.get(block.habitId) : null;
  const year = block.year ?? new Date().getFullYear();
  const today = todayISO();
  const color = habit?.color ?? block.color ?? '#3c7a4f';

  const markFor = (isoKey: string): Mark | null => {
    if (habit) return habit.entries[isoKey] ?? null;
    return block.marks?.[isoKey] ?? null;
  };
  const { cellProps } = usePainting((key) => {
    if (habit) act.setHabitMark(habit.id, key, stamp);
    else act.setBlockMark(pageId, block.id, key, stamp);
  });

  // boxes, not calendars: one box per day, day numbers run across the top row
  const labelW = 26;
  const gap = 2;
  // min width keeps the row inside the frame even on very narrow blocks (cells shrink, never overflow)
  const availW = Math.max(220, block.w - 20);
  const cell = Math.max(4, Math.min(16, Math.floor((availW - labelW - (31 - 1) * gap) / 31)));

  const nav = (d: number) => {
    act.updateBlock(pageId, block.id, { year: year + d });
  };

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={color}
      headerRight={
        <>
          <button
            onClick={(e) => { e.stopPropagation(); nav(-1); }}
            className="text-ink-soft hover:text-ink text-xs px-1"
            title="Previous year"
          >
            ‹
          </button>
          <span className="text-[12px] font-bold text-ink tabular-nums min-w-[34px] text-center">{year}</span>
          <button
            onClick={(e) => { e.stopPropagation(); nav(1); }}
            className="text-ink-soft hover:text-ink text-xs px-1"
            title="Next year"
          >
            ›
          </button>
          <StampRow value={stamp} onChange={setStamp} color={color} size={12} />
          <HabitChip block={block} pageId={pageId} />
        </>
      }
      labelEditable={false}
    >
      <div className="w-fit">
        {/* top row: the day numbers */}
        <div className="flex gap-[2px] mb-[3px]">
          <div className="shrink-0 text-[9px] font-bold text-ink-faint leading-none" style={{ width: labelW }} />
          {Array.from({ length: 31 }, (_, d) => (
            <div
              key={d}
              className="text-center text-[9px] font-semibold text-ink-faint leading-none tabular-nums"
              style={{ width: cell }}
            >
              {d + 1}
            </div>
          ))}
        </div>
        {/* one row of boxes per month */}
        {Array.from({ length: 12 }, (_, mo) => {
          const dim = daysInMonth(year, mo);
          return (
            <div key={mo} className="flex gap-[2px] mb-[2px] items-center">
              <div className="shrink-0 text-[10px] font-bold leading-none" style={{ width: labelW, color }}>
                {MONTH_SHORT[mo]}
              </div>
              {Array.from({ length: 31 }, (_, di) => {
                const day = di + 1;
                if (day > dim) return <div key={di} style={{ width: cell, height: cell }} />;
                const isoKey = iso(new Date(year, mo, day));
                return (
                  <Cell
                    key={di}
                    mark={markFor(isoKey)}
                    color={color}
                    size={cell}
                    today={isoKey === today}
                    {...cellProps(isoKey)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </TrackerFrame>
  );
}

// ---------------- pattern grid ----------------
export function PatternTracker({ block, pageId }: { block: Block; pageId: string }) {
  const { act } = useApp();
  const [stamp, setStamp] = useState<Mark>('star');
  const rows = block.rows ?? 8;
  const cols = block.cols ?? 10;
  const cell = Math.max(8, Math.min(20, Math.floor(Math.min(block.w - 24, (block.h - 56) / rows))));
  const { cellProps } = usePainting((key) => {
    act.setBlockMark(pageId, block.id, key, stamp);
  });

  return (
    <TrackerFrame
      block={block}
      pageId={pageId}
      habitColor={block.color ?? '#2c2a26'}
      headerRight={<StampRow value={stamp} onChange={setStamp} color="#2c2a26" size={12} />}
      labelEditable={false}
    >
      <div className="grid gap-[3px] w-fit" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const key = `${Math.floor(i / cols)}:${i % cols}`;
          return <Cell key={key} mark={block.marks?.[key] ?? null} color={block.color ?? '#2c2a26'} size={cell} {...cellProps(key)} />;
        })}
      </div>
    </TrackerFrame>
  );
}
