import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import type {
  Block,
  BlockType,
  Habit,
  Mark,
  Meta,
  Notebook,
  Page,
  Snapshot,
  StatKey,
  TableColumn
} from '../types';
import { PAGE_H, PAGE_W, uid } from '../types';
import { loadSnapshot, saveSnapshot } from '../lib/db';
import { seedSnapshot } from '../lib/seed';
import * as g from '../lib/gamify';
import { addDays, iso, monthKey, todayISO } from '../lib/dates';

// ---- actions ----
type Action =
  | { type: 'INIT'; snap: Snapshot }
  | { type: 'RESET' }
  | { type: 'OPEN_NOTEBOOK'; id: string | null }
  | { type: 'SET_DARK'; dark: boolean }
  | { type: 'SET_COMPANION'; on: boolean }
  | { type: 'CREATE_NOTEBOOK'; name: string; cover: string }
  | { type: 'RENAME_NOTEBOOK'; id: string; name: string }
  | { type: 'DELETE_NOTEBOOK'; id: string }
  | { type: 'SET_COVER'; id: string; cover: string }
  | { type: 'ADD_PAGE'; notebookId: string; title?: string }
  | { type: 'DUPLICATE_PAGE'; notebookId: string; pageId: string }
  | { type: 'DELETE_PAGE'; notebookId: string; pageId: string }
  | { type: 'MOVE_PAGE'; notebookId: string; from: number; to: number }
  | { type: 'SPLIT_PAGE'; notebookId: string; pageId: string }
  | { type: 'TOGGLE_BOOKMARK'; pageId: string }
  | { type: 'UPDATE_PAGE'; pageId: string; patch: Partial<Page> }
  | { type: 'ADD_BLOCK'; pageId: string; block: Block }
  | { type: 'UPDATE_BLOCK'; pageId: string; blockId: string; patch: Partial<Block> }
  | { type: 'REMOVE_BLOCK'; pageId: string; blockId: string }
  | { type: 'ADD_HABIT'; habit: Habit }
  | { type: 'UPDATE_HABIT'; habitId: string; patch: Partial<Habit> }
  | { type: 'DELETE_HABIT'; habitId: string }
  | { type: 'SET_HABIT_MARK'; habitId: string; dateISO: string; mark: Mark | null }
  | { type: 'SET_BLOCK_MARK'; pageId: string; blockId: string; key: string; mark: Mark | null }
  | { type: 'SET_DRAWING'; pageId: string; drawing: string }
  | { type: 'SPEND'; cost: number; itemId: string }
  | { type: 'POP_LEVEL' }
  | { type: 'NEW_DAY' };

interface UIState {
  currentNotebookId: string | null;
  dark: boolean;
  companionOn: boolean;
}

interface State {
  snap: Snapshot;
  loaded: boolean;
  ui: UIState;
}

const emptySnap = (): Snapshot => ({
  notebooks: [],
  pages: {},
  habits: [],
  meta: {
    xp: 0,
    ink: 0,
    statXp: { discipline: 0, knowledge: 0, health: 0, creativity: 0, focus: 0, mindfulness: 0 },
    achievements: [],
    unlocked: [],
    levelQueue: [],
    perfectDays: 0,
    habitCompletions: 0,
    lastActive: null,
    lastPerfectDay: null,
    pet: { name: 'Inky', type: 'fox', stage: 1, satisfaction: 60 }
  }
});

// ---- one-time demo-layout migration v3: habits page → one straight table, year page → real 2026/2027 calendars ----
function migrateHabitTableAndYear(snap: Snapshot): Snapshot {
  const pages = { ...snap.pages };
  // habits page: merge the vertical tracker columns into ONE straight-line table
  const habitsId = Object.keys(pages).find((k) => k === 'p-habits' || pages[k].title === 'Habits');
  if (habitsId) {
    const hp = pages[habitsId];
    const cols = hp.blocks
      .filter((b) => b.type === 'vertical' || b.type === 'horizontal')
      .map((b) => ({ label: b.label ?? undefined, habitId: b.habitId }) as TableColumn);
    if (cols.length >= 2) {
      const table: Block = {
        id: uid(),
        type: 'table',
        x: 36,
        y: 112,
        w: 470,
        h: 520,
        rotate: 0,
        columns: cols,
        month: monthKey(new Date())
      };
      const keep = hp.blocks.filter((b) => b.type !== 'vertical' && b.type !== 'horizontal');
      pages[habitsId] = { ...hp, blocks: [...keep, table] };
    }
  }
  // year page: grow the year block so the real 2026 + 2027 calendars fit
  const yearId = Object.keys(pages).find((k) => k === 'p-year' || pages[k].title === 'Year in Pixels');
  if (yearId) {
    const yp = pages[yearId];
    pages[yearId] = {
      ...yp,
      blocks: yp.blocks.map((b) => {
        if (b.type === 'year') return { ...b, w: 470, h: 560, rotate: 0, x: 26, y: 84 };
        if (b.type === 'text' && b.y < 420) return { ...b, y: 656, h: 36, w: 430, x: 46 };
        return b;
      })
    };
  }
  return { ...snap, pages };
}

// ---- one-time migration v5: separate blocks that overlap (demo notebook got crowded) ----
// decorative blocks (tape / sticky notes / dividers) are left alone — they're meant to overlap
const SOLID = new Set<BlockType>(['heading', 'text', 'todo', 'section', 'vertical', 'horizontal', 'boxes', 'calendar', 'weekly', 'year', 'pattern', 'gcal', 'table']);
function migrateNoOverlap(snap: Snapshot): Snapshot {
  let changed = false;
  const pages: Record<string, Page> = {};
  for (const [id, page] of Object.entries(snap.pages)) {
    const sorted = [...page.blocks].sort((a, b) => a.y - b.y);
    const placed: Block[] = [];
    let pageChanged = false;
    const next: Block[] = [];
    for (const b of sorted) {
      const solid = SOLID.has(b.type);
      if (!solid) {
        placed.push(b);
        next.push(b);
        continue;
      }
      const hits = placed.filter(
        (o) => SOLID.has(o.type) && b.x < o.x + o.w + 8 && b.x + b.w + 8 > o.x && b.y < o.y + o.h + 8 && b.y + b.h + 8 > o.y
      );
      if (hits.length) {
        const lowest = placed.reduce((acc, o) => (SOLID.has(o.type) ? Math.max(acc, o.y + o.h) : acc), 0);
        const nb = { ...b, y: Math.round(lowest + 14) };
        placed.push(nb);
        next.push(nb);
        pageChanged = true;
      } else {
        placed.push(b);
        next.push(b);
      }
    }
    if (pageChanged) {
      pages[id] = { ...page, blocks: next };
      changed = true;
    } else {
      pages[id] = page;
    }
  }
  return changed ? { ...snap, pages } : snap;
}

// ---- one-time migration v6: everything straight, nothing overlapping, compact year boxes ----
// (a) every block on every page is straightened (rotate → 0) — no tilted text or borders anywhere
// (b) year blocks become the compact box grid (dates across the top, months down the side)
// (c) overlapping solid blocks are pushed below their lowest neighbour so nothing overlaps
function migrateStraightenSeparate(snap: Snapshot): Snapshot {
  const yearPageId = Object.keys(snap.pages).find((k) => k === 'p-year' || snap.pages[k].title === 'Year in Pixels');
  let changed = false;
  const pages: Record<string, Page> = {};
  for (const [id, page] of Object.entries(snap.pages)) {
    let pageChanged = false;
    const hasYear = page.blocks.some((b) => b.type === 'year');
    const blocks = page.blocks.map((b) => {
      let nb = b;
      if (nb.rotate) {
        nb = { ...nb, rotate: 0 };
        pageChanged = true;
      }
      if (nb.type === 'year') {
        // the new box-grid year fits in ~215px of content; 280px leaves a little air
        nb = {
          ...nb,
          w: 470,
          h: 280,
          rotate: 0,
          x: Math.max(12, Math.min(nb.x, PAGE_W - 470 - 12)),
          y: Math.max(12, Math.min(nb.y, PAGE_H - 280 - 12))
        };
        pageChanged = true;
      }
      // the old year-page caption used to sit under the tall calendar block
      if (id === yearPageId && hasYear && nb.type === 'text' && nb.y > 600) {
        nb = { ...nb, y: 390 };
        pageChanged = true;
      }
      return nb;
    });
    // separate overlapping solid blocks (decorative tape / sticky notes may overlap on purpose)
    const sorted = [...blocks].sort((a, b) => a.y - b.y);
    const placed: Block[] = [];
    const next: Block[] = [];
    for (const b of sorted) {
      if (!SOLID.has(b.type)) {
        placed.push(b);
        next.push(b);
        continue;
      }
      const hits = placed.filter(
        (o) => SOLID.has(o.type) && b.x < o.x + o.w + 8 && b.x + b.w + 8 > o.x && b.y < o.y + o.h + 8 && b.y + b.h + 8 > o.y
      );
      if (hits.length) {
        const lowest = placed.reduce((acc, o) => (SOLID.has(o.type) ? Math.max(acc, o.y + o.h) : acc), 0);
        const nb = { ...b, y: Math.round(lowest + 14) };
        placed.push(nb);
        next.push(nb);
        pageChanged = true;
      } else {
        placed.push(b);
        next.push(b);
      }
    }
    pages[id] = pageChanged ? { ...page, blocks: next } : page;
    if (pageChanged) changed = true;
  }
  return changed ? { ...snap, pages } : snap;
}

// ---- one-time migration v8: give the 'No Spend $' tracker a little more breathing room ----
function migrateNoSpendDown(snap: Snapshot): Snapshot {
  let changed = false;
  const pages: Record<string, Page> = {};
  for (const [id, page] of Object.entries(snap.pages)) {
    let pageChanged = false;
    const blocks = page.blocks.map((b) => {
      if (b.type === 'horizontal' && (b.label ?? '').toLowerCase().includes('no spend') && b.y < 460) {
        pageChanged = true;
        return { ...b, y: 474 };
      }
      return b;
    });
    pages[id] = pageChanged ? { ...page, blocks } : page;
    if (pageChanged) changed = true;
  }
  return changed ? { ...snap, pages } : snap;
}

// ---- runs on EVERY load: keep solid blocks from overlapping (idempotent — no-op when clean) ----
// Solid blocks that the user dragged on top of each other are nudged below their lowest neighbour
// so nothing ever stays overlapped, even after a reload.
function migrateSeparateOverlaps(snap: Snapshot): Snapshot {
  let changed = false;
  const pages: Record<string, Page> = {};
  for (const [id, page] of Object.entries(snap.pages)) {
    const sorted = [...page.blocks].sort((a, b) => a.y - b.y || a.x - b.x);
    const placed: Block[] = [];
    const next: Block[] = [];
    let pageChanged = false;
    for (const b of sorted) {
      if (!SOLID.has(b.type)) {
        placed.push(b);
        next.push(b);
        continue;
      }
      const hits = placed.filter(
        (o) => SOLID.has(o.type) && b.x < o.x + o.w + 6 && b.x + b.w + 6 > o.x && b.y < o.y + o.h + 6 && b.y + b.h + 6 > o.y
      );
      if (hits.length) {
        const overlap = (cand: Block, o: Block) =>
          cand.x < o.x + o.w + 6 && cand.x + cand.w + 6 > o.x && cand.y < o.y + o.h + 6 && cand.y + cand.h + 6 > o.y;
        const fits = (cand: Block) =>
          cand.x >= 12 && cand.x + cand.w <= PAGE_W - 12 && cand.y >= 12 && cand.y + cand.h <= PAGE_H - 8 &&
          !placed.some((o) => SOLID.has(o.type) && overlap(cand, o));
        const lowest = placed.reduce((acc, o) => (SOLID.has(o.type) ? Math.max(acc, o.y + o.h) : acc), 0);
        // 1) push below the lowest neighbour; 2) else slide to the right of the widest overlap;
        // 3) else clamp to the page bottom (content simply can't fit — best effort)
        let nb: Block | null = null;
        const below = { ...b, y: Math.round(lowest + 12) };
        if (fits(below)) nb = below;
        else {
          const right = { ...b, x: Math.round(hits.reduce((m, o) => Math.max(m, o.x + o.w), 0) + 12) };
          if (fits(right)) nb = right;
          else nb = { ...b, y: Math.min(Math.round(lowest + 12), Math.max(12, PAGE_H - b.h - 8)) };
        }
        placed.push(nb);
        next.push(nb);
        pageChanged = true;
      } else {
        placed.push(b);
        next.push(b);
      }
    }
    if (pageChanged) {
      pages[id] = { ...page, blocks: next };
      changed = true;
    } else {
      pages[id] = page;
    }
  }
  return changed ? { ...snap, pages } : snap;
}

// ---- one-time demo-layout migration: "No Spend $" belongs BELOW the monthly planner card ----
function migrateNoSpendBelowPlanner(snap: Snapshot): Snapshot {
  const habits = snap.pages['p-habits'];
  const boxes = snap.pages['p-boxes'];
  if (!habits || !boxes) return snap;
  const noSpend = habits.blocks.find(
    (b) => b.type === 'horizontal' && (b.label ?? '').toLowerCase().includes('no spend')
  );
  if (!noSpend) return snap;
  const habitsNext = { ...habits, blocks: habits.blocks.filter((b) => b.id !== noSpend.id) };
  const lowest = boxes.blocks.reduce((acc, b) => Math.max(acc, b.y + b.h), 24);
  const moved: Block = {
    ...noSpend,
    id: uid(),
    x: 30,
    y: Math.min(PAGE_H - 120, lowest + 20),
    w: 460,
    h: 100,
    rotate: 0.3
  };
  const boxesNext = { ...boxes, blocks: [...boxes.blocks, moved] };
  return { ...snap, pages: { ...snap.pages, [habits.id]: habitsNext, [boxes.id]: boxesNext } };
}

function applyAchievements(
  meta: Meta,
  habits: Habit[],
  dateISO: string
): { meta: Meta; fresh: string[] } {
  const level = g.levelFromXp(meta.xp);
  const bestStreak = habits.reduce((acc, h) => Math.max(acc, g.habitStreak(h, new Date()).best), 0);
  const todayDone = habits.length > 0 && g.dayCompletions(habits, dateISO) >= habits.length;
  const fresh = g.checkAchievements({ habits, meta, level, bestStreak, todayDone }, meta.achievements);
  if (!fresh.length) return { meta, fresh };
  return {
    meta: { ...meta, achievements: [...meta.achievements, ...fresh] },
    fresh
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return { ...state, snap: action.snap, loaded: true };
    case 'RESET':
      return { ...state, snap: seedSnapshot(), ui: { ...state.ui, currentNotebookId: null } };
    case 'OPEN_NOTEBOOK':
      return { ...state, ui: { ...state.ui, currentNotebookId: action.id } };
    case 'SET_DARK':
      return { ...state, ui: { ...state.ui, dark: action.dark } };
    case 'SET_COMPANION':
      return { ...state, ui: { ...state.ui, companionOn: action.on } };
    case 'CREATE_NOTEBOOK': {
      const nb: Notebook = {
        id: uid(),
        name: action.name,
        cover: action.cover,
        pages: [],
        createdAt: todayISO()
      };
      const page: Page = {
        id: uid(),
        notebookId: nb.id,
        title: 'First page',
        paper: 'ruled',
        blocks: [
          {
            id: uid(),
            type: 'heading',
            x: 54,
            y: 66,
            w: 420,
            h: 46,
            rotate: 0,
            text: action.name
          },
          {
            id: uid(),
            type: 'text',
            x: 58,
            y: 140,
            w: 420,
            h: 60,
            rotate: 0,
            text: 'A fresh page. Draw, type, or press "+" to add a tracker.'
          }
        ],
        drawing: '{"version":"6.0.0","objects":[]}',
        createdAt: todayISO()
      };
      nb.pages = [page.id];
      return {
        ...state,
        snap: { ...state.snap, notebooks: [...state.snap.notebooks, nb], pages: { ...state.snap.pages, [page.id]: page } },
        ui: { ...state.ui, currentNotebookId: nb.id }
      };
    }
    case 'RENAME_NOTEBOOK':
      return {
        ...state,
        snap: {
          ...state.snap,
          notebooks: state.snap.notebooks.map((n) => (n.id === action.id ? { ...n, name: action.name } : n))
        }
      };
    case 'DELETE_NOTEBOOK': {
      const nb = state.snap.notebooks.find((n) => n.id === action.id);
      const pages = { ...state.snap.pages };
      nb?.pages.forEach((pid) => delete pages[pid]);
      return {
        ...state,
        snap: {
          ...state.snap,
          notebooks: state.snap.notebooks.filter((n) => n.id !== action.id),
          pages
        },
        ui: { ...state.ui, currentNotebookId: null }
      };
    }
    case 'SET_COVER':
      return {
        ...state,
        snap: {
          ...state.snap,
          notebooks: state.snap.notebooks.map((n) => (n.id === action.id ? { ...n, cover: action.cover } : n))
        }
      };
    case 'ADD_PAGE': {
      const page: Page = {
        id: uid(),
        notebookId: action.notebookId,
        title: action.title ?? `Page ${(state.snap.notebooks.find((n) => n.id === action.notebookId)?.pages.length ?? 0) + 1}`,
        paper: 'ruled',
        blocks: [],
        drawing: '{"version":"6.0.0","objects":[]}',
        createdAt: todayISO()
      };
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: { ...state.snap.pages, [page.id]: page },
          notebooks: state.snap.notebooks.map((n) =>
            n.id === action.notebookId ? { ...n, pages: [...n.pages, page.id] } : n
          )
        }
      };
    }
    case 'DUPLICATE_PAGE': {
      const src = state.snap.pages[action.pageId];
      if (!src) return state;
      const copy: Page = { ...src, id: uid(), title: src.title + ' (copy)', blocks: src.blocks.map((b) => ({ ...b, id: uid() })), createdAt: todayISO() };
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: { ...state.snap.pages, [copy.id]: copy },
          notebooks: state.snap.notebooks.map((n) =>
            n.id === action.notebookId
              ? { ...n, pages: [...n.pages, copy.id] }
              : n
          )
        }
      };
    }
    case 'DELETE_PAGE': {
      const pages = { ...state.snap.pages };
      delete pages[action.pageId];
      return {
        ...state,
        snap: {
          ...state.snap,
          pages,
          notebooks: state.snap.notebooks.map((n) =>
            n.id === action.notebookId ? { ...n, pages: n.pages.filter((p) => p !== action.pageId) } : n
          )
        }
      };
    }
    case 'MOVE_PAGE': {
      const nb = state.snap.notebooks.find((n) => n.id === action.notebookId);
      if (!nb) return state;
      const pages = [...nb.pages];
      const [moved] = pages.splice(action.from, 1);
      pages.splice(action.to, 0, moved);
      return {
        ...state,
        snap: {
          ...state.snap,
          notebooks: state.snap.notebooks.map((n) => (n.id === action.notebookId ? { ...n, pages } : n))
        }
      };
    }
    case 'SPLIT_PAGE': {
      const nb = state.snap.notebooks.find((n) => n.id === action.notebookId);
      const src = state.snap.pages[action.pageId];
      if (!nb || !src) return state;
      // horizontal split: blocks whose center sits in the lower half move to a brand-new page
      const fold = Math.round(PAGE_H * 0.55);
      const lower = src.blocks
        .filter((b) => b.y + b.h / 2 >= fold)
        .map((b) => ({ ...b, id: uid(), y: Math.max(24, Math.round(b.y - fold + 24)) }));
      if (!lower.length) return state;
      const keep = src.blocks.filter((b) => b.y + b.h / 2 < fold);
      const idx = nb.pages.indexOf(action.pageId);
      if (idx < 0) return state;
      const next: Page = {
        ...src,
        id: uid(),
        title: src.title + ' — part 2',
        blocks: lower,
        // the new page starts as a clean sheet — ink stays on the original page
        drawing: '{"version":"6.0.0","objects":[]}',
        bookmarked: false,
        createdAt: todayISO()
      };
      const pages = [...nb.pages];
      pages.splice(idx + 1, 0, next.id);
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: { ...state.snap.pages, [action.pageId]: { ...src, blocks: keep }, [next.id]: next },
          notebooks: state.snap.notebooks.map((n) => (n.id === action.notebookId ? { ...n, pages } : n))
        }
      };
    }
    case 'TOGGLE_BOOKMARK': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: { ...state.snap.pages, [action.pageId]: { ...page, bookmarked: !page.bookmarked } }
        }
      };
    }
    case 'UPDATE_PAGE': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: { ...state.snap, pages: { ...state.snap.pages, [action.pageId]: { ...page, ...action.patch } } }
      };
    }
    case 'ADD_BLOCK': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: { ...state.snap.pages, [action.pageId]: { ...page, blocks: [...page.blocks, action.block] } }
        }
      };
    }
    case 'UPDATE_BLOCK': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: {
            ...state.snap.pages,
            [action.pageId]: {
              ...page,
              blocks: page.blocks.map((b) => (b.id === action.blockId ? { ...b, ...action.patch } : b))
            }
          }
        }
      };
    }
    case 'REMOVE_BLOCK': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: {
            ...state.snap.pages,
            [action.pageId]: { ...page, blocks: page.blocks.filter((b) => b.id !== action.blockId) }
          }
        }
      };
    }
    case 'ADD_HABIT':
      return { ...state, snap: { ...state.snap, habits: [...state.snap.habits, action.habit] } };
    case 'UPDATE_HABIT':
      return {
        ...state,
        snap: {
          ...state.snap,
          habits: state.snap.habits.map((h) => (h.id === action.habitId ? { ...h, ...action.patch } : h))
        }
      };
    case 'DELETE_HABIT':
      return {
        ...state,
        snap: {
          ...state.snap,
          habits: state.snap.habits.filter((h) => h.id !== action.habitId)
        }
      };
    case 'SET_HABIT_MARK': {
      const habits = state.snap.habits.map((h) => (h.id === action.habitId ? { ...h, entries: { ...h.entries } } : h));
      const habit = habits.find((h) => h.id === action.habitId);
      if (!habit) return state;
      const existed = habit.entries[action.dateISO];
      let meta: Meta = { ...state.snap.meta, statXp: { ...state.snap.meta.statXp }, levelQueue: [...state.snap.meta.levelQueue], pet: { ...state.snap.meta.pet } };
      let gain = 0;
      let fresh: string[] = [];

      if (action.mark === null || existed === action.mark) {
        if (existed) delete habit.entries[action.dateISO];
      } else if (existed) {
        habit.entries[action.dateISO] = action.mark;
      } else {
        habit.entries[action.dateISO] = action.mark;
        const streak = g.overallStreak(habits, new Date());
        const mult = g.comboMult(streak);
        gain = Math.round(g.DIFF_XP[habit.difficulty] * mult);
        meta.xp += gain;
        meta.statXp[habit.stat] += 10;
        meta.ink += 2;
        meta.habitCompletions += 1;
        meta.lastActive = todayISO();
        meta.pet.satisfaction = Math.min(100, meta.pet.satisfaction + 3);
        const nl = g.levelFromXp(meta.xp);
        const ol = g.levelFromXp(meta.xp - gain);
        for (let l = ol + 1; l <= nl; l++) meta.levelQueue.push(l);
      }
      // perfect day bonus
      if (g.perfectDay(habits, action.dateISO) && meta.lastPerfectDay !== action.dateISO) {
        meta.xp += 100;
        meta.ink += 10;
        meta.perfectDays += 1;
        meta.statXp.discipline += 10;
        meta.lastPerfectDay = action.dateISO;
        const nl = g.levelFromXp(meta.xp);
        const ol = g.levelFromXp(meta.xp - 100 - gain);
        for (let l = ol + 1; l <= nl; l++) meta.levelQueue.push(l);
      }
      ({ meta, fresh } = applyAchievements(meta, habits, action.dateISO));
      return {
        ...state,
        snap: { ...state.snap, habits, meta: { ...meta, achievements: meta.achievements } }
      };
    }
    case 'SET_BLOCK_MARK': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      const block = page.blocks.find((b) => b.id === action.blockId);
      if (!block) return state;
      const marks = { ...(block.marks ?? {}) };
      if (action.mark === null || marks[action.key] === action.mark) delete marks[action.key];
      else marks[action.key] = action.mark;
      return {
        ...state,
        snap: {
          ...state.snap,
          pages: {
            ...state.snap.pages,
            [action.pageId]: {
              ...page,
              blocks: page.blocks.map((b) => (b.id === action.blockId ? { ...b, marks } : b))
            }
          }
        }
      };
    }
    case 'SET_DRAWING': {
      const page = state.snap.pages[action.pageId];
      if (!page) return state;
      return {
        ...state,
        snap: { ...state.snap, pages: { ...state.snap.pages, [action.pageId]: { ...page, drawing: action.drawing } } }
      };
    }
    case 'SPEND': {
      const meta = { ...state.snap.meta, unlocked: [...state.snap.meta.unlocked] };
      if (meta.ink < action.cost) return state;
      meta.ink -= action.cost;
      if (!meta.unlocked.includes(action.itemId)) meta.unlocked.push(action.itemId);
      return { ...state, snap: { ...state.snap, meta } };
    }
    case 'POP_LEVEL': {
      const meta = { ...state.snap.meta, levelQueue: state.snap.meta.levelQueue.slice(1) };
      return { ...state, snap: { ...state.snap, meta } };
    }
    case 'NEW_DAY': {
      const today = todayISO();
      if (state.snap.meta.lastActive === today) return state;
      let satisfaction = state.snap.meta.pet.satisfaction;
      if (state.snap.meta.lastActive) {
        const gap = Math.max(
          1,
          Math.round((new Date(today).getTime() - new Date(state.snap.meta.lastActive).getTime()) / 86400000) - 1
        );
        satisfaction = Math.max(25, satisfaction - gap * 5);
      }
      return {
        ...state,
        snap: {
          ...state.snap,
          meta: { ...state.snap.meta, lastActive: today, pet: { ...state.snap.meta.pet, satisfaction } }
        }
      };
    }
    default:
      return state;
  }
}

// ---- block factory ----
const BLOCK_DEFAULTS: Record<BlockType, Partial<Block>> = {
  heading: { w: 400, h: 46 },
  text: { w: 400, h: 64 },
  todo: { w: 400, h: 150 },
  divider: { w: 380, h: 14 },
  sticky: { w: 130, h: 130, stickColor: '#f3e9b8' },
  washi: { w: 150, h: 20 },
  section: { w: 400, h: 36 },
  vertical: { w: 148, h: 460 },
  horizontal: { w: 450, h: 170 },
  boxes: { w: 470, h: 320 },
  calendar: { w: 310, h: 268 },
  weekly: { w: 320, h: 120 },
  year: { w: 470, h: 280 },
  pattern: { w: 250, h: 210 },
  gcal: { w: 400, h: 320 },
  table: { w: 470, h: 520 }
};

export function makeBlock(type: BlockType, extra: Partial<Block> = {}): Block {
  const def = BLOCK_DEFAULTS[type];
  return {
    id: uid(),
    type,
    x: 70,
    y: 90,
    w: def.w ?? 300,
    h: def.h ?? 100,
    rotate: 0, // everything starts straight
    ...def,
    ...extra
  } as Block;
}

// ---- context ----
interface AppApi {
  state: State;
  dispatch: React.Dispatch<Action>;
  undoHistory: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void };
  lastSaved: number | null;
  habitsById: Map<string, Habit>;
  currentNotebook: Notebook | null;
  level: number;
  levelInfo: { level: number; cur: number; need: number; pct: number };
  overallStreak: number;
  comboMult: number;
  bestStreak: number;
  todayDone: number;
  dueToday: number;
  act: {
    openNotebook: (id: string | null) => void;
    setDark: (d: boolean) => void;
    setCompanion: (on: boolean) => void;
    createNotebook: (name: string, cover: string) => void;
    addPage: (notebookId: string, title?: string) => void;
    duplicatePage: (notebookId: string, pageId: string) => void;
    deletePage: (notebookId: string, pageId: string) => void;
    movePage: (notebookId: string, from: number, to: number) => void;
    splitPage: (notebookId: string, pageId: string) => void;
    toggleBookmark: (pageId: string) => void;
    updatePage: (pageId: string, patch: Partial<Page>) => void;
    addBlock: (pageId: string, block: Block) => void;
    updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
    removeBlock: (pageId: string, blockId: string) => void;
    addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'entries'>) => Habit;
    updateHabit: (habitId: string, patch: Partial<Habit>) => void;
    deleteHabit: (habitId: string) => void;
    setHabitMark: (habitId: string, dateISO: string, mark: Mark | null) => void;
    setBlockMark: (pageId: string, blockId: string, key: string, mark: Mark | null) => void;
    setDrawing: (pageId: string, drawing: string) => void;
    spend: (cost: number, itemId: string) => void;
    popLevel: () => void;
    reset: () => void;
    deleteNotebook: (id: string) => void;
    renameNotebook: (id: string, name: string) => void;
    setCover: (id: string, cover: string) => void;
  };
}

const Ctx = createContext<AppApi | null>(null);

// ---- undo/redo: actions that are pure UI/navigation and must NOT create history steps ----
const TRANSIENT = new Set<Action['type']>([
  'INIT',
  'OPEN_NOTEBOOK',
  'SET_DARK',
  'SET_COMPANION',
  'POP_LEVEL',
  'NEW_DAY'
]);

// fast successive edits of the same target (block drag/resize, painting cells, ink strokes)
// collapse into ONE undo step
const COALESCE_MS = 450;

function coalesceKey(a: Action): string | null {
  switch (a.type) {
    // only positional edits (drag/resize/rotate) collapse into one step — text, todos etc. stay separate
    case 'UPDATE_BLOCK': {
      const p = a.patch;
      const positional =
        p.x !== undefined || p.y !== undefined || p.w !== undefined || p.h !== undefined || p.rotate !== undefined;
      return positional ? `ub:${a.pageId}:${a.blockId}` : null;
    }
    case 'UPDATE_PAGE':
      return `up:${a.pageId}`;
    case 'SET_BLOCK_MARK':
      return `mb:${a.pageId}:${a.blockId}`;
    case 'SET_HABIT_MARK':
      return `mh:${a.habitId}`;
    // strokes + duplicate object-added events collapse into one step
    case 'SET_DRAWING':
      return `sd:${a.pageId}`;
    default:
      return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { snap: emptySnap(), loaded: false, ui: { currentNotebookId: null, dark: false, companionOn: true } });
  const saveTimer = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- global undo/redo history (whole snapshot per step) ----
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const lastPushRef = useRef<{ key: string | null; time: number } | null>(null);
  // last snapshot we recorded — guards against same-tick double dispatches (React batching)
  // pushing the same stale snapshot twice and creating a no-op undo step
  const lastPushedSnapRef = useRef<Snapshot | null>(null);
  const [, bumpHist] = useReducer((v: number) => v + 1, 0);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const trackedDispatch = useCallback((action: Action) => {
    if (TRANSIENT.has(action.type)) {
      dispatch(action);
      return;
    }
    const key = coalesceKey(action);
    const now = Date.now();
    const last = lastPushRef.current;
    if (key && last && last.key === key && now - last.time < COALESCE_MS) {
      // still dragging / painting the same thing — one undo step for the whole gesture
      dispatch(action);
      return;
    }
    if (stateRef.current.snap === lastPushedSnapRef.current) {
      // same render batch as the previous push (two dispatches in one handler) — no duplicate step
      dispatch(action);
      return;
    }
    pastRef.current.push(stateRef.current.snap);
    lastPushedSnapRef.current = stateRef.current.snap;
    if (pastRef.current.length > 60) pastRef.current.shift();
    futureRef.current = [];
    lastPushRef.current = key ? { key, time: now } : null;
    bumpHist();
    dispatch(action);
  }, []);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(stateRef.current.snap);
    if (futureRef.current.length > 60) futureRef.current.shift();
    lastPushRef.current = null;
    lastPushedSnapRef.current = null;
    bumpHist();
    dispatch({ type: 'INIT', snap: prev });
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(stateRef.current.snap);
    lastPushRef.current = null;
    lastPushedSnapRef.current = null;
    bumpHist();
    dispatch({ type: 'INIT', snap: next });
  }, []);

  // Ctrl/Cmd + Z / Y / Shift+Z anywhere (unless typing in a field) undoes the notebook
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      if (k === 'y' || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo]);

  // load once
  useEffect(() => {
    let alive = true;
    (async () => {
      const snap = await loadSnapshot();
      if (!alive) return;
      if (snap) {
        let s = snap;
        if (localStorage.getItem('inkquest-layout-v2') !== '1') {
          s = migrateNoSpendBelowPlanner(s);
          localStorage.setItem('inkquest-layout-v2', '1');
        }
        if (localStorage.getItem('inkquest-layout-v4') !== '1') {
          s = migrateHabitTableAndYear(s);
          localStorage.setItem('inkquest-layout-v4', '1');
        }
        if (localStorage.getItem('inkquest-layout-v5') !== '1') {
          s = migrateNoOverlap(s);
          localStorage.setItem('inkquest-layout-v5', '1');
        }
        if (localStorage.getItem('inkquest-layout-v7') !== '1') {
          s = migrateStraightenSeparate(s);
          localStorage.setItem('inkquest-layout-v7', '1');
        }
        if (localStorage.getItem('inkquest-layout-v8') !== '1') {
          s = migrateNoSpendDown(s);
          localStorage.setItem('inkquest-layout-v8', '1');
        }
        // always keep solid blocks from overlapping (idempotent) — fixes any overlap on every load
        s = migrateSeparateOverlaps(s);
        dispatch({ type: 'INIT', snap: s });
      } else {
        dispatch({ type: 'INIT', snap: seedSnapshot() });
      }
    })();
    const dark = localStorage.getItem('inkquest-dark') === '1';
    const comp = localStorage.getItem('inkquest-companion') !== '0';
    dispatch({ type: 'SET_DARK', dark });
    dispatch({ type: 'SET_COMPANION', on: comp });
    return () => {
      alive = false;
    };
  }, []);

  // persist debounced — flip the "✓ saved" indicator once the write lands
  useEffect(() => {
    if (!state.loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveSnapshot(stateRef.current.snap).then(() => setLastSaved(Date.now()));
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state.snap, state.loaded]);

  useEffect(() => {
    const onUnload = () => {
      void saveSnapshot(stateRef.current.snap);
    };
    window.addEventListener('beforeunload', onUnload);
    const tick = window.setInterval(() => dispatch({ type: 'NEW_DAY' }), 60000);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.clearInterval(tick);
    };
  }, []);

  const habits = state.snap.habits;
  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);
  const currentNotebook =
    state.snap.notebooks.find((n) => n.id === state.ui.currentNotebookId) ?? null;

  const derived = useMemo(() => {
    const levelInfo = g.levelProgress(state.snap.meta.xp);
    const os = g.overallStreak(habits, new Date());
    const bestStreak = habits.reduce((acc, h) => Math.max(acc, g.habitStreak(h, new Date()).best), 0);
    const tISO = todayISO();
    return {
      levelInfo,
      level: levelInfo.level,
      overallStreak: os,
      comboMult: g.comboMult(os),
      bestStreak,
      todayDone: g.dayCompletions(habits, tISO),
      dueToday: habits.length
    };
  }, [habits, state.snap.meta.xp]);

  const act = useMemo(
    () => {
      const dispatch = trackedDispatch;
      return {
      openNotebook: (id: string | null) => dispatch({ type: 'OPEN_NOTEBOOK', id }),
      setDark: (dark: boolean) => {
        localStorage.setItem('inkquest-dark', dark ? '1' : '0');
        dispatch({ type: 'SET_DARK', dark });
      },
      setCompanion: (on: boolean) => {
        localStorage.setItem('inkquest-companion', on ? '1' : '0');
        dispatch({ type: 'SET_COMPANION', on });
      },
      createNotebook: (name: string, cover: string) => dispatch({ type: 'CREATE_NOTEBOOK', name, cover }),
      addPage: (notebookId: string, title?: string) => dispatch({ type: 'ADD_PAGE', notebookId, title }),
      duplicatePage: (notebookId: string, pageId: string) => dispatch({ type: 'DUPLICATE_PAGE', notebookId, pageId }),
      deletePage: (notebookId: string, pageId: string) => dispatch({ type: 'DELETE_PAGE', notebookId, pageId }),
      movePage: (notebookId: string, from: number, to: number) => dispatch({ type: 'MOVE_PAGE', notebookId, from, to }),
      splitPage: (notebookId: string, pageId: string) => dispatch({ type: 'SPLIT_PAGE', notebookId, pageId }),
      toggleBookmark: (pageId: string) => dispatch({ type: 'TOGGLE_BOOKMARK', pageId }),
      updatePage: (pageId: string, patch: Partial<Page>) => dispatch({ type: 'UPDATE_PAGE', pageId, patch }),
      addBlock: (pageId: string, block: Block) => {
        // never overlap: drop the new block below the lowest block already on the page
        const page = stateRef.current.snap.pages[pageId];
        const lowest = (page?.blocks ?? []).reduce((acc, b) => Math.max(acc, b.y + b.h), 0);
        const placed: Block = {
          ...block,
          x: Math.max(24, Math.min(block.x, PAGE_W - block.w - 12)),
          y: Math.max(24, Math.min(Math.max(24, lowest + 18), PAGE_H - block.h - 12))
        };
        dispatch({ type: 'ADD_BLOCK', pageId, block: placed });
      },
      updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) =>
        dispatch({ type: 'UPDATE_BLOCK', pageId, blockId, patch }),
      removeBlock: (pageId: string, blockId: string) => dispatch({ type: 'REMOVE_BLOCK', pageId, blockId }),
      addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'entries'>) => {
        const habit: Habit = { ...h, id: uid(), createdAt: todayISO(), entries: {} };
        dispatch({ type: 'ADD_HABIT', habit });
        return habit;
      },
      updateHabit: (habitId: string, patch: Partial<Habit>) => dispatch({ type: 'UPDATE_HABIT', habitId, patch }),
      deleteHabit: (habitId: string) => dispatch({ type: 'DELETE_HABIT', habitId }),
      setHabitMark: (habitId: string, dateISO: string, mark: Mark | null) =>
        dispatch({ type: 'SET_HABIT_MARK', habitId, dateISO, mark }),
      setBlockMark: (pageId: string, blockId: string, key: string, mark: Mark | null) =>
        dispatch({ type: 'SET_BLOCK_MARK', pageId, blockId, key, mark }),
      setDrawing: (pageId: string, drawing: string) => dispatch({ type: 'SET_DRAWING', pageId, drawing }),
      spend: (cost: number, itemId: string) => dispatch({ type: 'SPEND', cost, itemId }),
      popLevel: () => dispatch({ type: 'POP_LEVEL' }),
      reset: () => dispatch({ type: 'RESET' }),
      deleteNotebook: (id: string) => dispatch({ type: 'DELETE_NOTEBOOK', id }),
      renameNotebook: (id: string, name: string) => dispatch({ type: 'RENAME_NOTEBOOK', id, name }),
      setCover: (id: string, cover: string) => dispatch({ type: 'SET_COVER', id, cover })
      };
    },
    [trackedDispatch]
  );

  const api: AppApi = {
    state,
    dispatch: trackedDispatch,
    habitsById,
    currentNotebook,
    ...derived,
    act,
    undoHistory: { canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0, undo, redo },
    lastSaved
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
