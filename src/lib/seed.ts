// ---- seed data: a beautiful starting notebook ----
import type { Block, BlockType, Habit, Mark, Meta, Page, Snapshot } from '../types';
import { daysInMonth, iso, monthKey, todayISO } from './dates';

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HABIT_DEFS: { name: string; color: string; difficulty: Habit['difficulty']; stat: Habit['stat']; rate: number; streak?: number; marks: Mark[] }[] = [
  { name: 'Brush Teeth', color: '#3b6ea5', difficulty: 'easy', stat: 'discipline', rate: 0.92, streak: 9, marks: ['check', 'x'] },
  { name: 'Take Meds', color: '#c0392b', difficulty: 'easy', stat: 'health', rate: 0.9, streak: 4, marks: ['check'] },
  { name: 'Make Bed', color: '#3c7a4f', difficulty: 'easy', stat: 'discipline', rate: 0.85, marks: ['x', 'check'] },
  { name: 'No Spend $', color: '#b7791f', difficulty: 'medium', stat: 'discipline', rate: 0.72, marks: ['x', 'fill'] },
  { name: 'Read 20 Pages', color: '#7c5cbf', difficulty: 'medium', stat: 'knowledge', rate: 0.68, streak: 7, marks: ['x', 'dot'] },
  { name: 'Meditate', color: '#c2547e', difficulty: 'medium', stat: 'mindfulness', rate: 0.6, marks: ['dot', 'check'] },
  { name: 'Workout', color: '#c0392b', difficulty: 'hard', stat: 'health', rate: 0.55, marks: ['fill', 'x'] },
  { name: 'Journal', color: '#3b6ea5', difficulty: 'medium', stat: 'mindfulness', rate: 0.62, marks: ['check', 'heart'] },
  { name: 'Code', color: '#2c2a26', difficulty: 'hard', stat: 'knowledge', rate: 0.58, marks: ['x', 'star'] },
  { name: 'No Sugar', color: '#b7791f', difficulty: 'hard', stat: 'health', rate: 0.6, marks: ['x'] },
  { name: 'Draw', color: '#7c5cbf', difficulty: 'medium', stat: 'creativity', rate: 0.5, marks: ['star', 'heart'] }
];

let bcounter = 0;
function B(type: BlockType, partial: Partial<Block> & { x: number; y: number }): Block {
  const defaults: Partial<Block> = {
    heading: { w: 400, h: 46 },
    text: { w: 400, h: 64 },
    todo: { w: 400, h: 150 },
    divider: { w: 380, h: 14 },
    sticky: { w: 130, h: 130, stickColor: '#f3e9b8' },
    washi: { w: 150, h: 20 },
    section: { w: 400, h: 40 },
    vertical: { w: 148, h: 460 },
    horizontal: { w: 450, h: 180 },
    boxes: { w: 470, h: 320 },
    calendar: { w: 310, h: 268 },
    weekly: { w: 320, h: 120 },
    year: { w: 470, h: 560 },
    pattern: { w: 250, h: 210 },
    gcal: { w: 400, h: 320 },
    table: { w: 470, h: 520 }
  }[type] as Partial<Block>;
  return {
    id: `b${bcounter++}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    ...defaults,
    ...partial,
    rotate: 0 // everything starts straight — nothing tilted or rotated
  } as Block;
}

// ---- hand-drawn ink strokes (fabric JSON paths, absolute page coords) ----
interface Pt {
  x: number;
  y: number;
}
function jittered(pts: Pt[], amt: number): Pt[] {
  return pts.map((p, i) =>
    i === 0 || i === pts.length - 1 ? p : { x: p.x + (Math.random() - 0.5) * amt, y: p.y + (Math.random() - 0.5) * amt }
  );
}
function ink(ptsIn: Pt[], opts: { color?: string; width?: number; opacity?: number } = {}) {
  const pts = jittered(ptsIn, opts.width ? opts.width * 0.7 : 1.4);
  const path: unknown[] = [['M', pts[0].x, pts[0].y]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    path.push(['Q', a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2]);
  }
  const last = pts[pts.length - 1];
  path.push(['L', last.x, last.y]);
  return {
    type: 'path',
    version: '6.0.0',
    fill: null,
    stroke: opts.color ?? '#2c2a26',
    strokeWidth: opts.width ?? 2,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    strokeUniform: true,
    opacity: opts.opacity ?? 1,
    path
  };
}
function circle(cx: number, cy: number, r: number, wob = 1.2): Pt[] {
  const pts: Pt[] = [];
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * (r + (Math.random() - 0.5) * wob), y: cy + Math.sin(a) * (r + (Math.random() - 0.5) * wob) });
  }
  return pts;
}

function seedDrawing(): string {
  const objects: unknown[] = [];
  // hand-drawn sun
  objects.push(ink(circle(120, 170, 34, 2.4), { color: '#b7791f', width: 2.4 }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r1 = 44;
    const r2 = 58;
    objects.push(
      ink(
        [
          { x: 120 + Math.cos(a) * r1, y: 170 + Math.sin(a) * r1 },
          { x: 120 + Math.cos(a) * r2, y: 170 + Math.sin(a) * r2 }
        ],
        { color: '#b7791f', width: 2.2 }
      )
    );
  }
  // wavy sea line
  const wave: Pt[] = [];
  for (let i = 0; i <= 20; i++) wave.push({ x: 60 + i * 18, y: 230 + Math.sin(i * 0.9) * 7 });
  objects.push(ink(wave, { color: '#3b6ea5', width: 2.4 }));
  // arrow
  objects.push(ink([{ x: 320, y: 120 }, { x: 430, y: 120 }], { width: 2.6 }));
  objects.push(ink([{ x: 430, y: 120 }, { x: 420, y: 110 }, { x: 420, y: 130 }], { width: 2.6 }));
  // scribble underline
  const scrib: Pt[] = [];
  for (let i = 0; i <= 14; i++) scrib.push({ x: 60 + i * 9, y: 290 + Math.sin(i * 2.2) * 3 });
  objects.push(ink(scrib, { color: '#c0392b', width: 2.2 }));
  // star doodle
  const star: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 26 : 11;
    star.push({ x: 420 + Math.cos(a) * r, y: 260 + Math.sin(a) * r });
  }
  objects.push(ink(star, { color: '#7c5cbf', width: 2.2 }));
  return JSON.stringify({ version: '6.0.0', objects });
}

export function seedSnapshot(): Snapshot {
  const det = mulberry32(20260807);
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const dim = daysInMonth(y, m);
  const mk = monthKey(today);
  const tISO = todayISO();

  const habits: Habit[] = HABIT_DEFS.map((def, hi) => {
    const entries: Record<string, Mark> = {};
    for (let d = 1; d <= dim; d++) {
      const di = iso(new Date(y, m, d));
      if (di > tISO) break;
      let marked = det() < def.rate;
      if (def.streak) {
        const daysBack = Math.round((new Date(tISO).getTime() - new Date(di).getTime()) / 86400000);
        marked = daysBack < def.streak ? true : marked;
      }
      if (marked) entries[di] = def.marks[Math.floor(det() * def.marks.length)];
    }
    return {
      id: `habit-${hi + 1}`,
      name: def.name,
      color: def.color,
      difficulty: def.difficulty,
      stat: def.stat,
      createdAt: iso(new Date(y, m, 1)),
      entries
    };
  });

  const meta: Meta = {
    xp: 340,
    ink: 145,
    statXp: { discipline: 260, knowledge: 180, health: 210, creativity: 120, focus: 90, mindfulness: 150 },
    achievements: ['first-step', 'builder', 'doodle'],
    unlocked: [],
    levelQueue: [],
    perfectDays: 0,
    habitCompletions: 47,
    lastActive: tISO,
    lastPerfectDay: null,
    pet: { name: 'Inky', type: 'fox', stage: 1, satisfaction: 82 }
  };

  const pWelcome = 'p-welcome';
  const pHabits = 'p-habits';
  const pBoxes = 'p-boxes';
  const pCal = 'p-cal';
  const pYear = 'p-year';
  const pWeekly = 'p-weekly';
  const pJournal = 'p-journal';
  const pBrain = 'p-brain';
  const pCalendar = 'p-calendar';

  const pages: Record<string, Page> = {
    [pWelcome]: {
      id: pWelcome,
      notebookId: 'nb-main',
      title: 'Welcome to InkQuest',
      paper: 'grid',
      createdAt: iso(new Date(y, m, 1)),
      blocks: [
        B('washi', { x: 44, y: 26, w: 130, h: 20 }),
        B('heading', { x: 54, y: 66, w: 420, h: 46, text: 'Welcome to InkQuest' }),
        B('section', { x: 58, y: 122, w: 380, h: 36, text: 'MY LIFE BOOK', color: '#c0392b' }),
        B('text', { x: 58, y: 168, w: 420, h: 80, text: 'This is your notebook — draw anywhere, tap a square to mark a habit, hit the + button to add blocks from your sketches. Everything autosaves to this device.' }),
        B('sticky', { x: 350, y: 300, w: 130, h: 130, stickColor: '#f3e9b8', text: 'Try the pen →\nthen tap the squares in “Habits”!' }),
        B('todo', { x: 58, y: 300, w: 260, h: 150, todos: [
          { id: 't1', text: 'Create a habit', done: true },
          { id: 't2', text: 'Draw something', done: true },
          { id: 't3', text: 'Start a streak', done: false },
          { id: 't4', text: 'Unlock a reward', done: false }
        ] }),
        B('divider', { x: 60, y: 500, w: 400, h: 14 }),
        B('text', { x: 58, y: 530, w: 420, h: 60, text: 'Tip: press "/" anywhere on a page to open the block menu — calendars, trackers, sticky notes and more.' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pHabits]: {
      id: pHabits,
      notebookId: 'nb-main',
      title: 'Habits',
      paper: 'grid',
      createdAt: iso(new Date(y, m, 2)),
      bookmarked: true,
      blocks: [
        B('heading', { x: 44, y: 30, w: 300, h: 40, text: `${mk} Habits` }),
        B('washi', { x: 360, y: 26, w: 120, h: 20 }),
        B('table', {
          x: 36,
          y: 96,
          w: 470,
          h: 540,
          month: mk,
          columns: [
            { label: 'Brush Teeth', habitId: 'habit-1' },
            { label: 'Take Meds', habitId: 'habit-2' },
            { label: 'Read 20 Pages', habitId: 'habit-5' }
          ]
        })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pBoxes]: {
      id: pBoxes,
      notebookId: 'nb-main',
      title: 'Monthly Boxes',
      paper: 'dot',
      createdAt: iso(new Date(y, m, 3)),
      blocks: [
        B('heading', { x: 70, y: 24, w: 380, h: 40, text: 'Monthly Boxes' }),
        B('boxes', {
          x: 24,
          y: 84,
          w: 470,
          h: 330,
          boxes: [
            { label: 'Brush Teeth', habitId: 'habit-1' },
            { label: 'Take Meds', habitId: 'habit-2' },
            { label: 'Make Bed', habitId: 'habit-3' },
            { label: 'Meditate', habitId: 'habit-6' }
          ]
        }),
        B('horizontal', { x: 30, y: 474, w: 460, h: 100, habitId: 'habit-4', label: 'No Spend $' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pCal]: {
      id: pCal,
      notebookId: 'nb-main',
      title: 'Monthly Calendar',
      paper: 'dot',
      createdAt: iso(new Date(y, m, 3)),
      blocks: [
        B('heading', { x: 70, y: 24, w: 380, h: 40, text: 'Monthly Calendar' }),
        B('calendar', { x: 100, y: 90, w: 330, h: 240, month: mk, label: '' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pYear]: {
      id: pYear,
      notebookId: 'nb-main',
      title: 'Year in Pixels',
      paper: 'grid',
      createdAt: iso(new Date(y, m, 4)),
      blocks: [
        B('heading', { x: 90, y: 24, w: 340, h: 40, text: 'Year in Pixels' }),
        B('year', { x: 26, y: 84, w: 470, h: 280 }),
        B('text', { x: 46, y: 390, w: 430, h: 36, text: 'One box per day — dates run across the top, months down the side. Switch years with the ‹ › buttons.' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pWeekly]: {
      id: pWeekly,
      notebookId: 'nb-main',
      title: 'Weekly Rhythm',
      paper: 'blank',
      createdAt: iso(new Date(y, m, 5)),
      blocks: [
        B('heading', { x: 90, y: 24, w: 340, h: 40, text: 'Weekly Rhythm' }),
        B('weekly', { x: 60, y: 90, w: 330, h: 130, label: 'MORNING', marks: { '0': 'x', '1': 'check', '2': 'fill' } }),
        B('weekly', { x: 60, y: 250, w: 330, h: 130, label: 'NIGHT', marks: { '0': 'star', '4': 'heart', '5': 'dot' } }),
        B('pattern', { x: 60, y: 400, w: 260, h: 220, rows: 8, cols: 10, label: 'Mood doodle', marks: { '0:0': 'star', '1:1': 'heart', '2:2': 'x', '3:3': 'fill', '4:4': 'dot', '5:5': 'check' } }),
        B('sticky', { x: 340, y: 430, w: 130, h: 130, stickColor: '#d8e6c8', text: '“Small steps,\nevery day.”' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pJournal]: {
      id: pJournal,
      notebookId: 'nb-main',
      title: 'Journal',
      paper: 'ruled',
      createdAt: iso(new Date(y, m, 6)),
      bookmarked: true,
      blocks: [
        B('heading', { x: 70, y: 30, w: 380, h: 40, text: 'Journal' }),
        B('section', { x: 60, y: 86, w: 300, h: 32, text: 'AUG ' + String(y), color: '#b7791f' }),
        B('text', { x: 60, y: 320, w: 430, h: 90, text: 'Today I kept my streak alive. The notebook is becoming the system — every square marked is a small promise kept.' }),
        B('todo', { x: 60, y: 430, w: 300, h: 120, todos: [
          { id: 'j1', text: 'Gratitude: morning light', done: true },
          { id: 'j2', text: 'One thing done well', done: true },
          { id: 'j3', text: 'Tomorrow: read + journal', done: false }
        ] })
      ],
      drawing: seedDrawing()
    },
    [pBrain]: {
      id: pBrain,
      notebookId: 'nb-main',
      title: 'Brain Dump',
      paper: 'grid',
      createdAt: iso(new Date(y, m, 7)),
      blocks: [
        B('heading', { x: 90, y: 24, w: 340, h: 40, text: 'Brain Dump' }),
        B('washi', { x: 330, y: 20, w: 140, h: 20 }),
        B('sticky', { x: 40, y: 96, w: 130, h: 130, stickColor: '#f3e9b8', text: 'Idea: track\ndistractions\nthis week' }),
        B('sticky', { x: 185, y: 110, w: 130, h: 130, stickColor: '#f6d8d8', text: 'Gift ideas:\nsocks, books,\nlego' }),
        B('sticky', { x: 330, y: 96, w: 130, h: 130, stickColor: '#d8e6c8', text: 'Pack bag\nfor arts\nFriday!' }),
        B('todo', { x: 40, y: 270, w: 430, h: 170, todos: [
          { id: 'b1', text: 'Call audiologist', done: false },
          { id: 'b2', text: 'Stock photos to sell', done: true },
          { id: 'b3', text: 'Find camera kit', done: false },
          { id: 'b4', text: 'Wash bedding', done: true },
          { id: 'b5', text: 'Thumbnails for channel', done: false }
        ] }),
        B('divider', { x: 60, y: 470, w: 400, h: 14 }),
        B('text', { x: 60, y: 500, w: 420, h: 60, text: 'Nothing here is urgent — it just needed a home. The notebook holds it all.' })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    },
    [pCalendar]: {
      id: pCalendar,
      notebookId: 'nb-main',
      title: 'This Month',
      paper: 'grid',
      createdAt: iso(new Date(y, m, 8)),
      blocks: [
        B('heading', { x: 70, y: 24, w: 380, h: 40, text: 'This Month' }),
        B('gcal', { x: 70, y: 84, w: 380, h: 320, month: mk, color: '#3b6ea5', marks: Object.fromEntries([1, 4, 8, 12, 15, 19, 23, 28].filter((d) => d <= dim).map((d) => [iso(new Date(y, m, d)), d % 2 ? 'star' : 'heart'])) }),
        B('todo', { x: 70, y: 440, w: 380, h: 150, todos: [
          { id: 'c1', text: 'Thanksgiving — paper plates & napkins', done: false },
          { id: 'c2', text: 'Nanna & Pappa — reminder w/ mom', done: false },
          { id: 'c3', text: 'Monthly review', done: false }
        ] })
      ],
      drawing: '{"version":"6.0.0","objects":[]}'
    }
  };

  const notebooks = [
    {
      id: 'nb-main',
      name: 'My Life Book',
      cover: 'ink',
      pages: [pWelcome, pHabits, pBoxes, pCal, pYear, pWeekly, pJournal, pBrain, pCalendar],
      createdAt: iso(new Date(y, m, 1))
    }
  ];

  return { notebooks, pages, habits, meta };
}
