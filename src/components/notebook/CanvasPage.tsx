import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Ellipse, Line, Path, PencilBrush, Point, Rect, Textbox } from 'fabric';
import type { Page } from '../../types';
import { PAGE_H, PAGE_W } from '../../types';
import { useApp } from '../../state/AppContext';

export type Tool =
  | 'move'
  | 'select'
  | 'pen'
  | 'pencil'
  | 'marker'
  | 'brush'
  | 'highlighter'
  | 'calligraphy'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'shape';

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow';

export const DRAW_TOOLS: Tool[] = ['pen', 'pencil', 'marker', 'brush', 'highlighter', 'calligraphy'];

export const JITTER: Record<string, number> = {
  pen: 0.9,
  pencil: 2.0,
  marker: 0.7,
  brush: 1.6,
  highlighter: 0.5,
  calligraphy: 1.4
};

export const PRESET_OPACITY: Record<string, number> = {
  pen: 1,
  pencil: 0.82,
  marker: 0.55,
  brush: 0.9,
  highlighter: 0.34,
  calligraphy: 0.95
};

// eraser paints the paper color (white-out style), matching the page
const PAPER_BG: Record<string, string> = {
  grid: '#f6f1e5',
  dot: '#f6f1e5',
  ruled: '#f8f4ea',
  blank: '#f8f4ea',
  dark: '#26292e',
  craft: '#dcc9a6',
  vintage: '#efe0bd'
};

// add hand-drawn wobble to a completed stroke
function jitterPath(pathObj: any, amt: number) {
  const path = pathObj.path as unknown[][];
  if (!Array.isArray(path) || path.length < 3) return;
  const targets: [number, number][] = [];
  for (let i = 1; i < path.length - 1; i++) {
    const cmd = path[i];
    if (typeof cmd[0] !== 'string') continue;
    for (let j = 1; j < cmd.length; j += 2) {
      if (typeof cmd[j] === 'number') targets.push([i, j]);
    }
  }
  if (!targets.length) return;
  const count = Math.max(3, Math.floor(targets.length * 0.8));
  for (let k = 0; k < count; k++) {
    const [i, j] = targets[Math.floor(Math.random() * targets.length)];
    (path[i][j] as number) += (Math.random() - 0.5) * amt;
    (path[i][j + 1] as number) += (Math.random() - 0.5) * amt;
  }
  try {
    pathObj._setPositionDimensions?.();
  } catch {
    /* ignore */
  }
  pathObj.setCoords();
}

interface Props {
  page: Page;
  tool: Tool;
  color: string;
  size: number;
  straight: boolean;
  shape: ShapeKind;
  interactive: boolean;
  active: boolean;
  onFocused: () => void;
}

export default function CanvasPage({
  page,
  tool,
  color,
  size,
  straight,
  shape,
  interactive,
  active,
  onFocused
}: Props) {
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const { act } = useApp();

  // floating action bar (✏️ edit / ✕ delete) for the canvas object selected with the select tool
  const [activeBar, setActiveBar] = useState<{ left: number; top: number; canEdit: boolean } | null>(null);

  const suppress = useRef(false);
  const pageIdRef = useRef(page.id);
  // last drawing JSON this canvas already holds — used to avoid reloading on our own saves
  const savedJsonRef = useRef<string>(page.drawing);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const colorRef = useRef(color);
  colorRef.current = color;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const straightRef = useRef(straight);
  straightRef.current = straight;
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  const activeRef = useRef(active);
  activeRef.current = active;

  const EXTRAS = ['data', 'eraser'];

  // every completed stroke/edit commits straight into app state → global undo/redo + autosave
  const saveState = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || suppress.current) return;
    try {
      const json = JSON.stringify(canvas.toObject(EXTRAS));
      savedJsonRef.current = json;
      act.setDrawing(pageIdRef.current, json);
    } catch {
      /* ignore */
    }
  }, [act]);

  // action bar handlers (declared after saveState)
  const editActive = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) (obj as Textbox).enterEditing?.();
  }, []);
  const deleteActive = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setActiveBar(null);
    saveState();
  }, [saveState]);

  // init / dispose per page
  useEffect(() => {
    pageIdRef.current = page.id;
    savedJsonRef.current = page.drawing;
    if (!canvasEl.current) return;
    const canvas = new Canvas(canvasEl.current, {
      width: PAGE_W,
      height: PAGE_H,
      selection: false,
      preserveObjectStacking: true
    });
    fabricRef.current = canvas;
    canvas.selectionColor = 'rgba(192,57,43,0.16)';
    canvas.selectionBorderColor = 'rgba(192,57,43,0.7)';
    canvas.selectionLineWidth = 1;
    canvas.uniformScaling = true;
    canvas.defaultCursor = 'default';
    canvas.skipTargetFind = true;

    suppress.current = true;
    let alive = true;
    try {
      const parsed = JSON.parse(page.drawing || '{"version":"6.0.0","objects":[]}');
      canvas
        .loadFromJSON(parsed)
        .then(() => {
          if (alive) {
            canvas.requestRenderAll();
            suppress.current = false;
          }
        })
        .catch(() => {
          suppress.current = false;
        });
    } catch {
      suppress.current = false;
    }

    canvas.on('path:created', (e) => {
      const p = e.path as any;
      p.strokeUniform = true;
      const t = toolRef.current;
      const j = JITTER[t] ?? 0;
      if (j > 0) jitterPath(p, j);
      p.opacity = PRESET_OPACITY[t] ?? 1;
      if (t === 'highlighter') p.globalCompositeOperation = 'multiply';
      p.data = t === 'eraser' ? { kind: 'whiteout' } : { kind: 'stroke' };
      saveState();
    });

    canvas.on('object:added', () => {
      if (suppress.current) return;
      saveState();
    });

    canvas.on('object:modified', () => {
      saveState();
    });

    canvas.on('text:editing:exited', () => {
      saveState();
    });

    canvas.on('mouse:dblclick', () => {
      const obj = canvas.getActiveObject();
      if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
        (obj as Textbox).enterEditing?.();
      }
    });

    // text / sticky tools — clicking an EXISTING text box with the text tool edits it,
    // instead of silently dropping a new empty box on top of it
    canvas.on('mouse:down', (opt) => {
      const t = toolRef.current;
      if (t === 'text' && opt.e) {
        const p = canvas.getPointer(opt.e);
        const hit = canvas
          .getObjects()
          .filter((o) => o.type === 'i-text' || o.type === 'textbox')
          .find((o) => o.containsPoint(p));
        if (hit) {
          canvas.setActiveObject(hit);
          canvas.requestRenderAll();
          (hit as Textbox).enterEditing?.();
          return;
        }
      }
      if ((t === 'text' || t === 'sticky') && opt.e) {
        const p = canvas.getPointer(opt.e);
        const tbOpts: any = {
          left: p.x,
          top: p.y,
          fill: '#2c2a26',
          fontFamily: '"Google Sans", "Product Sans", system-ui, sans-serif',
          fontSize: t === 'sticky' ? 17 : 22 + sizeRef.current,
          width: t === 'sticky' ? 132 : 180,
          padding: t === 'sticky' ? 12 : 4,
          lineHeight: 1.25,
          backgroundColor: t === 'sticky' ? colorRef.current : undefined,
          data: t === 'sticky' ? { kind: 'sticky' } : { kind: 'text' }
        };
        const tb = new Textbox('', tbOpts);
        canvas.add(tb);
        canvas.setActiveObject(tb);
        tb.enterEditing?.();
      }
    });

    // shape + straight-ruler tools
    let start: Point | null = null;
    let temp: any = null;
    const makeShape = (p0: Point, p1: Point) => {
      const c = colorRef.current;
      const w = sizeRef.current;
      const left = Math.min(p0.x, p1.x);
      const top = Math.min(p0.y, p1.y);
      const width = Math.abs(p1.x - p0.x);
      const height = Math.abs(p1.y - p0.y);
      const s = shapeRef.current;
      if (s === 'rect')
        return new Rect({ left, top, width, height, fill: 'rgba(255,255,255,0)', stroke: c, strokeWidth: w, rx: 2, ry: 2 });
      if (s === 'ellipse')
        return new Ellipse({ left: (p0.x + p1.x) / 2, top: (p0.y + p1.y) / 2, rx: width / 2, ry: height / 2, fill: 'rgba(255,255,255,0)', stroke: c, strokeWidth: w });
      if (s === 'line') return new Line([p0.x, p0.y, p1.x, p1.y], { stroke: c, strokeWidth: w, strokeLineCap: 'round' });
      return new Path(buildArrowPath(p0, p1), {
        stroke: c,
        strokeWidth: w,
        fill: null,
        strokeLineCap: 'round',
        strokeLineJoin: 'round'
      });
    };
    canvas.on('mouse:down', (opt) => {
      const t = toolRef.current;
      if ((t === 'shape' || (DRAW_TOOLS.includes(t) && straightRef.current)) && opt.e) {
        const p = canvas.getPointer(opt.e);
        start = p;
        if (t === 'shape') {
          temp = makeShape(p, p);
          canvas.add(temp);
        }
      }
    });
    canvas.on('mouse:move', (opt) => {
      if (!start || !temp || !opt.e) return;
      const p = canvas.getPointer(opt.e);
      const props = shapePropsFor(temp, start, p);
      temp.set(props);
      temp.setCoords();
      canvas.requestRenderAll();
    });
    canvas.on('mouse:up', (opt) => {
      if (start && temp) {
        canvas.requestRenderAll();
        saveState();
      }
      if (start && !temp && DRAW_TOOLS.includes(toolRef.current) && straightRef.current && opt.e) {
        const p = canvas.getPointer(opt.e);
        const line = new Line([start.x, start.y, p.x, p.y], {
          stroke: colorRef.current,
          strokeWidth: sizeRef.current,
          strokeLineCap: 'round'
        });
        canvas.add(line);
        saveState();
      }
      start = null;
      temp = null;
    });

    // keep the floating ✏️/✕ bar glued to whichever canvas object is selected
    const refreshActive = () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        setActiveBar(null);
        return;
      }
      const r = obj.getBoundingRect();
      setActiveBar({
        left: r.left + r.width,
        top: r.top,
        canEdit: obj.type === 'i-text' || obj.type === 'textbox'
      });
    };
    canvas.on('selection:created', refreshActive);
    canvas.on('selection:updated', refreshActive);
    canvas.on('selection:cleared', () => setActiveBar(null));
    canvas.on('object:moving', refreshActive);
    canvas.on('object:modified', refreshActive);

    return () => {
      alive = false;
      try {
        canvas.dispose();
      } catch {
        /* noop */
      }
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  // external change (undo/redo restored an older drawing) → reload the canvas silently
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (page.drawing === savedJsonRef.current) return;
    savedJsonRef.current = page.drawing;
    suppress.current = true;
    try {
      const parsed = JSON.parse(page.drawing || '{"version":"6.0.0","objects":[]}');
      canvas
        .loadFromJSON(parsed)
        .then(() => {
          canvas.requestRenderAll();
          suppress.current = false;
        })
        .catch(() => {
          suppress.current = false;
        });
    } catch {
      suppress.current = false;
    }
  }, [page.drawing]);

  // apply tool changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const t = tool;
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.skipTargetFind = true;
    canvas.defaultCursor = t === 'move' ? 'default' : 'crosshair';

    if (DRAW_TOOLS.includes(t)) {
      const b = new PencilBrush(canvas);
      b.color = color;
      b.width = size;
      b.strokeLineCap = t === 'calligraphy' ? 'butt' : 'round';
      b.strokeLineJoin = 'round';
      canvas.freeDrawingBrush = b;
      if (!straight) canvas.isDrawingMode = true;
    } else if (t === 'eraser') {
      // white-out: paint the paper color over the ink
      const b = new PencilBrush(canvas);
      b.color = PAPER_BG[page.paper] ?? '#f6f1e5';
      b.width = size * 3;
      b.strokeLineCap = 'round';
      canvas.freeDrawingBrush = b;
      canvas.isDrawingMode = true;
    } else if (t === 'select') {
      canvas.selection = true;
      canvas.skipTargetFind = false;
    }
    canvas.requestRenderAll();
  }, [tool, color, size, straight]);

  // belt & braces: keep the current brush's colour/size in perfect sync with the toolbar picks,
  // so picking a new ink colour always writes in that colour
  useEffect(() => {
    const canvas = fabricRef.current;
    const b = canvas?.freeDrawingBrush;
    if (b && DRAW_TOOLS.includes(toolRef.current)) {
      b.color = color;
      b.width = size;
    }
  }, [color, size]);

  // delete key removes selection in select mode (active page only)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (toolRef.current !== 'select' || !activeRef.current) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fabricRef.current;
        const activeObjs = canvas?.getActiveObjects();
        if (activeObjs?.length) {
          canvas!.discardActiveObject();
          activeObjs.forEach((o) => canvas!.remove(o));
          canvas!.requestRenderAll();
          saveState();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveState]);

  return (
    <div
      className="canvas-layer"
      style={{ zIndex: 30, pointerEvents: interactive && tool !== 'move' ? 'auto' : 'none' }}
      onPointerDownCapture={onFocused}
    >
      <canvas ref={canvasEl} />
      {/* action bar for the selected drawing object (text, shape, ink…) — visible in select
          mode, and also while using the text tool so typed text always has a visible remove/edit */}
      {activeBar && (tool === 'select' || tool === 'text' || tool === 'sticky') && (
        <div
          className="absolute z-50 flex items-center gap-1"
          style={{ left: activeBar.left - 84, top: activeBar.top - 38, pointerEvents: 'auto' }}
        >
          {activeBar.canEdit && (
            <button
              onClick={editActive}
              className="w-7 h-7 rounded-full bg-paper border border-ink/25 shadow-paper-sm flex items-center justify-center text-[12px] hover:bg-ink/10 transition"
              title="Edit text (double-click also works)"
            >
              ✏️
            </button>
          )}
          <button
            onClick={deleteActive}
            className="w-7 h-7 rounded-full bg-accent-red text-white shadow-paper-sm flex items-center justify-center text-[12px] hover:bg-accent-red/85 transition"
            title="Delete (Del key also works)"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function shapePropsFor(temp: any, p0: Point, p1: Point) {
  const s = temp.type;
  const left = Math.min(p0.x, p1.x);
  const top = Math.min(p0.y, p1.y);
  const width = Math.abs(p1.x - p0.x);
  const height = Math.abs(p1.y - p0.y);
  if (s === 'rect') return { left, top, width, height };
  if (s === 'ellipse') return { left: (p0.x + p1.x) / 2, top: (p0.y + p1.y) / 2, rx: width / 2, ry: height / 2 };
  if (s === 'line') return { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
  return { path: buildArrowPath(p0, p1) };
}

function buildArrowPath(p0: Point, p1: Point) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const ang = Math.atan2(dy, dx);
  const hl = 14;
  const a1 = ang + Math.PI * 0.82;
  const a2 = ang - Math.PI * 0.82;
  return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} M ${p1.x} ${p1.y} L ${p1.x + Math.cos(a1) * hl} ${p1.y + Math.sin(a1) * hl} M ${p1.x} ${p1.y} L ${p1.x + Math.cos(a2) * hl} ${p1.y + Math.sin(a2) * hl}`;
}
