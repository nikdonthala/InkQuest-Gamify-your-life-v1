import React, { useEffect, useMemo, useState } from 'react';
import type { Block, BlockType, Page } from '../../types';
import { makeBlock } from '../../state/AppContext';
import { useApp } from '../../state/AppContext';
import { PaperModal, HandTag } from '../ui';
import { MarkGlyph } from './trackers';

interface PickItem {
  type: BlockType;
  name: string;
  desc: string;
  preview: React.ReactNode;
  extra?: Partial<Parameters<typeof makeBlock>[1]>;
}

const ink = '#2c2a26';

function VPreview() {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="font-hand text-[9px] leading-none" style={{ color: '#3b6ea5' }}>
        habit
      </div>
      <div className="flex flex-col gap-[2px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="w-4 h-4 border border-ink/25 rounded-[2px] flex items-center justify-center">
            {i === 1 && <MarkGlyph mark="x" size={8} color="#3b6ea5" />}
            {i === 3 && <MarkGlyph mark="check" size={8} color="#3b6ea5" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function HPreview() {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="font-hand text-[9px] leading-none" style={{ color: '#c0392b' }}>
        habit
      </div>
      <div className="flex gap-[2px]">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="w-4 h-4 border border-ink/25 rounded-[2px] flex items-center justify-center">
            {(i === 2 || i === 6) && <MarkGlyph mark="fill" size={7} color="#c0392b" />}
            {i === 4 && <MarkGlyph mark="x" size={7} color="#c0392b" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoxesPreview() {
  return (
    <div className="grid grid-cols-2 gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border border-ink/25 rounded p-0.5">
          <div className="font-hand text-[8px] leading-none mb-0.5" style={{ color: ['#3b6ea5', '#c0392b', '#3c7a4f', '#b7791f'][i] }}>
            {['A', 'B', 'C', 'D'][i]}
          </div>
          <div className="grid grid-cols-4 gap-[1.5px]">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className={`w-3 h-3 rounded-[1.5px] ${j === i ? 'bg-ink/70' : 'border border-ink/20'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GCalPreview() {
  return (
    <div>
      <div className="grid grid-cols-7 gap-[2px] mb-[2px]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={i} className={`text-center text-[6px] font-bold ${i === 0 ? 'text-accent-red' : 'text-ink-faint'}`}>
            {d[0]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {Array.from({ length: 28 }, (_, i) => {
          const day = i - 1;
          const isToday = day === 12;
          return (
            <div
              key={i}
              className="relative rounded-[2px] border border-ink/15 flex items-center justify-center"
              style={{ width: 18, height: 15 }}
            >
              <span
                className={`text-[6px] font-medium ${isToday ? 'bg-accent-blue text-white w-[12px] h-[12px] rounded-full flex items-center justify-center' : 'text-ink/60'}`}
              >
                {day >= 1 ? day : ''}
              </span>
              {(day === 4 || day === 6 || day === 18) && <span className="absolute left-1 right-1 bottom-0.5 h-[2.5px] rounded-full bg-accent-blue/70" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalPreview() {
  return (
    <div>
      <div className="grid grid-cols-7 gap-[2px] mb-[2px]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[6px] font-bold text-ink-faint">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {Array.from({ length: 21 }, (_, i) => (
          <div
            key={i}
            className={`w-[13px] h-[13px] rounded-[2px] flex items-center justify-center text-[6px] ${
              i === 6 || i === 13 ? 'bg-ink/20' : 'border border-ink/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function WeeklyPreview() {
  return (
    <div className="flex gap-[2px]">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-[2px]">
          <div className="text-[6px] font-bold text-ink-faint">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</div>
          <div className={`w-[15px] h-[15px] rounded-[2px] ${i === 1 || i === 4 ? 'bg-ink/60' : 'border border-ink/25'}`} />
        </div>
      ))}
    </div>
  );
}

function YearPreview() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-1 mb-[2px]">
        <div className="text-[5px] text-ink-faint">‹</div>
        <div className="text-[6px] font-bold text-ink">2026</div>
        <div className="text-[5px] text-ink-faint">›</div>
      </div>
      <div className="flex gap-[1.5px] items-center mb-[1.5px]">
        <div className="w-[9px] shrink-0" />
        {Array.from({ length: 10 }, (_, d) => (
          <div key={d} className="flex-1 text-center text-[4px] leading-none text-ink-faint tabular-nums">
            {d + 1}
          </div>
        ))}
      </div>
      {['J', 'F', 'M', 'A'].map((ml, r) => (
        <div key={r} className="flex gap-[1.5px] items-center mb-[1.5px]">
          <div className="w-[9px] shrink-0 text-[5px] font-bold text-ink-faint">{ml}</div>
          {Array.from({ length: 10 }, (_, c) => (
            <div
              key={c}
              className={`flex-1 h-[8px] rounded-[1px] ${(r * 10 + c) % 5 === 0 ? 'bg-accent-green/70' : 'bg-ink/15'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function TablePreview() {
  return (
    <div className="w-full">
      <div className="flex gap-[2px] mb-[2px]">
        <div className="w-[12px] text-[5px] font-bold text-ink-faint text-center">#</div>
        {['Brush', 'Meds', 'Read'].map((h, i) => (
          <div key={i} className="flex-1 text-[5px] font-bold truncate" style={{ color: ['#3b6ea5', '#c0392b', '#7c5cbf'][i] }}>
            {h}
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map((r) => (
        <div key={r} className="flex gap-[2px] mb-[2px]">
          <div className="w-[12px] text-[5px] text-ink-faint text-center">{r + 1}</div>
          {[0, 1, 2].map((c) => (
            <div key={c} className={`flex-1 h-[9px] rounded-[1.5px] border border-ink/20 flex items-center justify-center ${(r === 1 && c === 0) || (r === 2 && c === 1) ? 'bg-ink/60 border-transparent' : ''}`}>
              {(r === 1 && c === 0) || (r === 2 && c === 1) ? <MarkGlyph mark="check" size={5} color="#fff" /> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PatternPreview() {
  return (
    <div className="grid grid-cols-5 gap-[2px]">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div key={i} className="w-[11px] h-[11px] rounded-[2px] border border-ink/25 flex items-center justify-center">
          {i === 2 && <MarkGlyph mark="star" size={7} color="#7c5cbf" />}
          {i === 5 && <MarkGlyph mark="heart" size={7} color="#c2547e" />}
          {i === 8 && <MarkGlyph mark="dot" size={5} color={ink} />}
        </div>
      ))}
    </div>
  );
}

export const PICKER_ITEMS: PickItem[] = [
  {
    type: 'heading',
    name: 'Heading',
    desc: 'Big title for a page or section',
    preview: <div className="text-[15px] font-bold leading-tight">Aa</div>
  },
  {
    type: 'text',
    name: 'Paragraph',
    desc: 'Plain writing, click to edit',
    preview: (
      <div className="space-y-[3px]">
        <div className="h-[3px] w-24 rounded bg-ink/60" />
        <div className="h-[3px] w-20 rounded bg-ink/35" />
        <div className="h-[3px] w-24 rounded bg-ink/25" />
      </div>
    )
  },
  {
    type: 'todo',
    name: 'To-do list',
    desc: 'Checkbox list — the notebook classic',
    preview: (
      <div className="space-y-[3px]">
        {[
          ['#3c7a4f', true],
          [ink, false],
          [ink, false]
        ].map(([c, done], i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-[8px] h-[8px] rounded-[2px] border ${done ? 'bg-accent-green border-accent-green' : 'border-ink/40'}`} />
            <div className="h-[3px] rounded" style={{ width: i === 0 ? 56 : 40, background: done ? '#a0a098' : 'rgba(44,42,38,0.5)' }} />
          </div>
        ))}
      </div>
    )
  },
  {
    type: 'section',
    name: 'Section label',
    desc: 'Handwritten heading with ink strokes',
    preview: <HandTag className="text-[14px]">MY LIFE BOOK</HandTag>
  },
  {
    type: 'divider',
    name: 'Divider',
    desc: 'A hand-drawn ink line',
    preview: (
      <svg width="80" height="10" viewBox="0 0 80 10">
        <path d="M1 5 Q 20 2 40 5 T 79 4" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    )
  },
  {
    type: 'sticky',
    name: 'Sticky note',
    desc: 'A little paper note',
    preview: (
      <div className="w-12 h-12 rounded-[3px] font-hand text-[9px] p-1 shadow-paper-sm" style={{ background: '#f3e9b8' }}>
        note!
      </div>
    )
  },
  {
    type: 'washi',
    name: 'Washi tape',
    desc: 'Decorative tape strip',
    preview: <div className="w-20 h-[10px] rounded-[1px] opacity-90" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0 3px, transparent 3px 6px), #e0a96d' }} />
  }
];

// ---- tracker formats: the user picks a format from a dropdown (yearly / monthly / weekly horizontal / graphical…) ----
interface TrackerFormat {
  id: string;
  label: string;
  short: string;
  type: BlockType;
  desc: string;
  extra?: Partial<Parameters<typeof makeBlock>[1]>;
}

const previewByType = (t: BlockType): React.ReactNode =>
  (({
    vertical: <VPreview />,
    horizontal: <HPreview />,
    boxes: <BoxesPreview />,
    gcal: <GCalPreview />,
    calendar: <CalPreview />,
    weekly: <WeeklyPreview />,
    year: <YearPreview />,
    pattern: <PatternPreview />,
    table: <TablePreview />
  }) as Record<string, React.ReactNode>)[t] ?? null;

export const TRACKER_FORMATS: TrackerFormat[] = [
  { id: 'table', label: 'Habit table', short: 'Table', type: 'table', desc: 'One straight table — habits across the top, days 1–31 down the side', extra: { columns: [{ label: 'Brush Teeth' }, { label: 'Take Meds' }, { label: 'Read 20 Pages' }] } },
  { id: 'yearly', label: 'Yearly — one year at a time', short: 'Yearly', type: 'year', desc: 'A straight box grid — dates across the top, months down the side, switch years with ‹ ›' },
  { id: 'monthly-gcal', label: 'Monthly — Google-style', short: 'Monthly', type: 'gcal', desc: 'Month view with day numbers, today circle & event chips' },
  { id: 'monthly-mini', label: 'Monthly — Mini calendar', short: 'Mini', type: 'calendar', desc: 'A compact month you can stamp' },
  { id: 'monthly-boxes', label: 'Monthly boxes', short: 'Boxes', type: 'boxes', desc: 'Four habit grids side by side, like your sketch', extra: { label: '', boxes: [{ label: 'Habit A' }, { label: 'Habit B' }, { label: 'Habit C' }, { label: 'Habit D' }] } },
  { id: 'weekly-h', label: 'Weekly (horizontal)', short: 'Weekly', type: 'weekly', desc: 'A S M T W T F S strip across the page', extra: { label: 'WEEK' } },
  { id: 'graphical-v', label: 'Graphical — habit grid (vertical)', short: 'Graphical', type: 'vertical', desc: 'Days run down the page, like a real bullet journal', extra: { label: 'New Habit' } },
  { id: 'graphical-h', label: 'Graphical — habit grid (horizontal)', short: 'H-Grid', type: 'horizontal', desc: 'Days run across the page', extra: { label: 'New Habit' } },
  { id: 'pattern', label: 'Pattern grid', short: 'Pattern', type: 'pattern', desc: 'Free doodle grid — cross, check, dot, star…', extra: { label: '', rows: 8, cols: 12 } }
];

export default function BlockPicker({
  page,
  open,
  onClose
}: {
  page: Page;
  open: boolean;
  onClose: () => void;
}) {
  const { act } = useApp();
  const items = useMemo(() => PICKER_ITEMS, []);
  const [fmtId, setFmtId] = useState(TRACKER_FORMATS[0].id);

  useEffect(() => {
    if (open) setFmtId(TRACKER_FORMATS[0].id);
  }, [open]);

  // act.addBlock() auto-places fresh blocks below the lowest existing one, so nothing overlaps
  const pick = (it: PickItem) => {
    act.addBlock(page.id, makeBlock(it.type, it.extra ?? {}));
    onClose();
  };

  const addFormat = (f: TrackerFormat) => {
    act.addBlock(page.id, makeBlock(f.type, f.extra ?? {}));
    onClose();
  };

  const textItems = items.filter((i) => ['heading', 'text', 'todo', 'section', 'divider', 'sticky', 'washi'].includes(i.type));
  const fmt = TRACKER_FORMATS.find((f) => f.id === fmtId) ?? TRACKER_FORMATS[0];

  return (
    <PaperModal open={open} onClose={onClose} title={<>Add a block to <span className="text-accent-red">{page.title}</span></>} width={620}>
      <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-2 mt-1">
        ✍️ Text & decorations
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {textItems.map((it) => (
          <PickCard key={it.type} it={it} onPick={() => pick(it)} />
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-widest text-ink-faint font-semibold mb-2 mt-5">
        🗓️ Trackers & calendars — pick a format
      </div>
      <div className="rounded-xl border border-ink/15 bg-white/40 p-3">
        <div className="flex items-center gap-2">
          <label htmlFor="tracker-format" className="text-[12px] font-semibold text-ink-soft whitespace-nowrap">
            Format
          </label>
          <select
            id="tracker-format"
            value={fmtId}
            onChange={(e) => setFmtId(e.target.value)}
            className="flex-1 rounded-lg border border-ink/20 bg-paper px-2.5 py-2 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-accent-red/40"
          >
            {TRACKER_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => addFormat(fmt)}
            className="rounded-lg bg-accent-red text-white px-4 py-2 text-[13px] font-semibold shadow-paper-sm hover:bg-accent-red/85 transition active:scale-95"
          >
            + Add
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-ink/10 bg-paper/70 p-2.5">
          <div className="w-44 h-[68px] shrink-0 flex items-center justify-center rounded-md border border-ink/5 bg-paper/60 overflow-hidden">
            {previewByType(fmt.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-ink">{fmt.label}</div>
            <div className="text-[11px] text-ink-faint leading-snug">{fmt.desc}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {TRACKER_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => addFormat(f)}
              title={`Add: ${f.desc}`}
              className={`rounded-full px-2.5 py-1 text-[11px] border transition ${
                fmtId === f.id
                  ? 'border-accent-red/60 bg-accent-red/10 text-accent-red font-semibold'
                  : 'border-ink/15 text-ink-soft hover:border-accent-red/40 hover:text-accent-red'
              }`}
            >
              {f.short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-ink-faint">
        Tip: after adding a grid, tap <span className="font-hand text-[14px] text-accent-red">“link habit…”</span> to connect it to a real habit — marks will sync and earn XP in real time.
      </div>
    </PaperModal>
  );
}

function PickCard({ it, onPick }: { it: PickItem; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="group flex flex-col items-start gap-2 rounded-lg border border-ink/15 bg-white/40 p-3 text-left transition hover:border-accent-red/50 hover:bg-white/70 hover:-translate-y-0.5 hover:shadow-paper-sm"
    >
      <div className="w-full h-[54px] flex items-center justify-center rounded-md bg-paper/70 border border-ink/5 overflow-hidden">
        {it.preview}
      </div>
      <div>
        <div className="text-[13px] font-semibold text-ink group-hover:text-accent-red transition-colors">{it.name}</div>
        <div className="text-[11px] text-ink-faint leading-snug">{it.desc}</div>
      </div>
    </button>
  );
}
