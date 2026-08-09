// ---- Core data model for InkQuest ----

export type Mark = 'x' | 'check' | 'dot' | 'fill' | 'diag' | 'star' | 'heart' | 'tri';
export const MARKS: Mark[] = ['x', 'check', 'dot', 'fill', 'diag', 'star', 'heart', 'tri'];
export const MARK_LABELS: Record<Mark, string> = {
  x: 'Cross',
  check: 'Check',
  dot: 'Dot',
  fill: 'Filled',
  diag: 'Diagonal',
  star: 'Star',
  heart: 'Heart',
  tri: 'Triangle'
};

export type StatKey =
  | 'discipline'
  | 'knowledge'
  | 'health'
  | 'creativity'
  | 'focus'
  | 'mindfulness';

export const STATS: { key: StatKey; label: string; color: string }[] = [
  { key: 'discipline', label: 'Discipline', color: '#c0392b' },
  { key: 'knowledge', label: 'Knowledge', color: '#3b6ea5' },
  { key: 'health', label: 'Health', color: '#3c7a4f' },
  { key: 'creativity', label: 'Creativity', color: '#7c5cbf' },
  { key: 'focus', label: 'Focus', color: '#b7791f' },
  { key: 'mindfulness', label: 'Mindfulness', color: '#c2547e' }
];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'goal';
export const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'goal', label: 'Major goal' }
];

export interface Habit {
  id: string;
  name: string;
  color: string;
  difficulty: Difficulty;
  stat: StatKey;
  createdAt: string;
  /** dateISO 'YYYY-MM-DD' -> mark */
  entries: Record<string, Mark>;
}

export type BlockType =
  | 'heading'
  | 'text'
  | 'todo'
  | 'divider'
  | 'sticky'
  | 'washi'
  | 'section'
  | 'vertical'
  | 'horizontal'
  | 'boxes'
  | 'calendar'
  | 'weekly'
  | 'year'
  | 'pattern'
  | 'gcal'
  | 'table';

export interface BoxConfig {
  label: string;
  habitId?: string;
}

export interface TableColumn {
  label?: string;
  habitId?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  text?: string;
  todos?: { id: string; text: string; done: boolean }[];
  habitId?: string;
  label?: string;
  /** key: 'boxIdx:dateISO' for boxes, 'colIdx:dateISO' for tables, ISO for calendars, day idx for weekly, 'r:c' for pattern */
  marks?: Record<string, Mark>;
  month?: string; // 'YYYY-MM'
  rows?: number;
  cols?: number;
  cell?: number;
  stickColor?: string;
  color?: string;
  boxes?: BoxConfig[];
  columns?: TableColumn[];
  year?: number; // which year the Year in Pixels shows
}

export type PaperStyle = 'grid' | 'dot' | 'blank' | 'ruled' | 'dark' | 'craft' | 'vintage';
export const PAPER_STYLES: { key: PaperStyle; label: string; swatch: string }[] = [
  { key: 'grid', label: 'Grid', swatch: 'linear-gradient(#00000014 1px, transparent 1px)' },
  { key: 'dot', label: 'Dot grid', swatch: 'radial-gradient(#00000018 1.2px, transparent 1.3px)' },
  { key: 'ruled', label: 'Ruled', swatch: 'repeating-linear-gradient(transparent 0 25px, #00000012 25px 26px)' },
  { key: 'blank', label: 'Blank', swatch: '#f6f1e5' },
  { key: 'dark', label: 'Dark', swatch: '#26292e' },
  { key: 'craft', label: 'Craft', swatch: '#d9c8a9' },
  { key: 'vintage', label: 'Vintage', swatch: '#efe0bd' }
];

export interface Page {
  id: string;
  notebookId: string;
  title: string;
  paper: PaperStyle;
  blocks: Block[];
  /** fabric.js canvas JSON */
  drawing: string;
  createdAt: string;
  bookmarked?: boolean;
}

export interface Notebook {
  id: string;
  name: string;
  cover: string;
  pages: string[];
  createdAt: string;
}

export const COVERS: { key: string; label: string; color: string }[] = [
  { key: 'ink', label: 'Ink Black', color: '#2d2a26' },
  { key: 'forest', label: 'Forest', color: '#3c5a4a' },
  { key: 'wine', label: 'Wine', color: '#6d3b47' },
  { key: 'navy', label: 'Navy', color: '#34495e' },
  { key: 'sand', label: 'Sandal', color: '#b08d5f' },
  { key: 'paper', label: 'Paper', color: '#efe6d2' }
];

export interface PetState {
  name: string;
  type: string;
  stage: number;
  satisfaction: number; // 0..100
}

export interface Meta {
  xp: number;
  ink: number;
  statXp: Record<StatKey, number>;
  achievements: string[];
  unlocked: string[]; // cosmetic ids
  levelQueue: number[];
  perfectDays: number;
  habitCompletions: number;
  lastActive: string | null;
  lastPerfectDay: string | null;
  pet: PetState;
}

export interface Snapshot {
  notebooks: Notebook[];
  pages: Record<string, Page>;
  habits: Habit[];
  meta: Meta;
}

export const PAGE_W = 520;
export const PAGE_H = 700;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
