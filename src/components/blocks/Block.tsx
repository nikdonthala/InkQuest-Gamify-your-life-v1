import React, { useEffect, useRef, useState } from 'react';
import type { Block, Page } from '../../types';
import { PAGE_H, PAGE_W } from '../../types';
import { useApp } from '../../state/AppContext';
import { Washi } from '../ui';
import {
  VerticalTracker,
  HorizontalTracker,
  BoxesTracker,
  CalendarTracker,
  GCalTracker,
  WeeklyTracker,
  YearTracker,
  PatternTracker,
  TableTracker
} from './trackers';

function useLocalText(value: string | undefined, onCommit: (v: string) => void) {
  const [val, setVal] = useState(value ?? '');
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const elRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editingRef.current) setVal(value ?? '');
  }, [value]);
  const commit = () => {
    setEditing(false);
    // commit whatever is there — including empty, so text can be deleted
    if (val !== (value ?? '')) onCommit(val);
  };
  const startEdit = () => {
    setVal(value ?? '');
    setEditing(true);
    // focus the editor and put the caret at the end so typing works on the first click
    requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  };
  return { val, setVal, editing, startEdit, commit, elRef };
}

// ---------------- content blocks (each with top-level hooks) ----------------

// the editable div grows/shrinks the block so text always stays inside the box
function autosize(act: { updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void }, page: Page, block: Block, el: HTMLElement) {
  const cur = block.h ?? 64;
  const need = el.scrollHeight + 6;
  if (need > cur - 2 && need < PAGE_H) {
    act.updateBlock(page.id, block.id, { h: Math.round(need) });
  } else if (cur - need > 24 && cur > 48) {
    act.updateBlock(page.id, block.id, { h: Math.max(48, Math.round(need)) });
  }
}

function HeadingBlock({ block, page }: { block: Block; page: Page }) {
  const { act } = useApp();
  const t = useLocalText(block.text, (v) => act.updateBlock(page.id, block.id, { text: v }));
  return (
    <div
      ref={t.elRef}
      data-edit-target
      className={`block-heading font-sans font-bold text-[28px] leading-tight text-ink ${t.editing ? 'cursor-text' : ''}`}
      contentEditable={t.editing}
      suppressContentEditableWarning
      onBlur={t.commit}
      onInput={(e) => {
        const el = e.target as HTMLElement;
        t.setVal(el.innerText);
        autosize(act, page, block, el);
      }}
      onClick={(e) => {
        e.stopPropagation();
        t.startEdit();
      }}
    >
      {block.text ?? 'Heading'}
    </div>
  );
}

function SectionBlock({ block, page }: { block: Block; page: Page }) {
  const { act } = useApp();
  const t = useLocalText(block.text, (v) => act.updateBlock(page.id, block.id, { text: v }));
  return (
    <div className="flex items-center gap-3 select-none">
      <svg width="34" height="10" viewBox="0 0 34 10" className="shrink-0">
        <path d="M1 7 Q 8 1 17 6 T 33 4" stroke={block.color ?? '#c0392b'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <div
        ref={t.elRef}
        data-edit-target
        className={`font-hand font-semibold text-[24px] leading-none tracking-wide ${t.editing ? 'cursor-text' : ''}`}
        style={{ color: block.color ?? '#c0392b' }}
        contentEditable={t.editing}
        suppressContentEditableWarning
        onBlur={t.commit}
        onInput={(e) => {
          const el = e.target as HTMLElement;
          t.setVal(el.innerText);
          autosize(act, page, block, el);
        }}
        onClick={(e) => {
          e.stopPropagation();
          t.startEdit();
        }}
      >
        {block.text ?? 'SECTION'}
      </div>
      <svg width="34" height="10" viewBox="0 0 34 10" className="shrink-0">
        <path d="M1 4 Q 8 9 17 4 T 33 6" stroke={block.color ?? '#c0392b'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function TextBlock({ block, page }: { block: Block; page: Page }) {
  const { act } = useApp();
  const t = useLocalText(block.text, (v) => act.updateBlock(page.id, block.id, { text: v }));
  return (
    <div
      ref={t.elRef}
      data-edit-target
      className={`block-text text-[16px] leading-relaxed text-ink/90 whitespace-pre-wrap ${t.editing ? 'cursor-text' : ''}`}
      contentEditable={t.editing}
      suppressContentEditableWarning
      onBlur={t.commit}
      onInput={(e) => {
        const el = e.target as HTMLElement;
        t.setVal(el.innerText);
        autosize(act, page, block, el);
      }}
      onClick={(e) => {
        e.stopPropagation();
        t.startEdit();
      }}
    >
      {block.text ?? 'Write something…'}
    </div>
  );
}

function StickyBlock({ block, page }: { block: Block; page: Page }) {
  const { act } = useApp();
  const t = useLocalText(block.text, (v) => act.updateBlock(page.id, block.id, { text: v }));
  return (
    <div
      ref={t.elRef}
      data-edit-target
      className={`h-full w-full rounded-sm p-2.5 font-hand text-[18px] leading-snug ${t.editing ? 'cursor-text' : ''}`}
      style={{
        background: block.stickColor ?? '#f3e9b8',
        boxShadow: '0 3px 6px rgba(44,42,38,0.18), inset 0 -6px 8px rgba(0,0,0,0.04)'
      }}
      contentEditable={t.editing}
      suppressContentEditableWarning
      onBlur={t.commit}
      onInput={(e) => {
        const el = e.target as HTMLElement;
        t.setVal(el.innerText);
        autosize(act, page, block, el);
      }}
      onClick={(e) => {
        e.stopPropagation();
        t.startEdit();
      }}
    >
      {block.text || 'write…'}
    </div>
  );
}

function TodoBlock({ block, page }: { block: Block; page: Page }) {
  const { act } = useApp();
  const todos = block.todos ?? [];
  return (
    <div className="space-y-1.5">
      {todos.map((td) => (
        <TodoItem key={td.id} td={td} block={block} page={page} />
      ))}
      <button
        data-no-drag
        onClick={(e) => {
          e.stopPropagation();
          act.updateBlock(page.id, block.id, {
            todos: [...todos, { id: Math.random().toString(36).slice(2, 8), text: '', done: false }]
          });
        }}
        className="text-ink-faint text-xs hover:text-ink transition mt-1 px-1"
      >
        + add item
      </button>
    </div>
  );
}

function TodoItem({
  td,
  block,
  page
}: {
  td: { id: string; text: string; done: boolean };
  block: Block;
  page: Page;
}) {
  const { act } = useApp();
  const [val, setVal] = useState(td.text);
  const [editing, setEditing] = useState(false);

  const update = (patch: Partial<{ text: string; done: boolean }>) =>
    act.updateBlock(page.id, block.id, {
      todos: (block.todos ?? []).map((x) => (x.id === td.id ? { ...x, ...patch } : x))
    });

  return (
    <div className="flex items-start gap-2 group/todo">
      <button
        data-no-drag
        onClick={(e) => {
          e.stopPropagation();
          update({ done: !td.done });
        }}
        className={`mt-0.5 w-[18px] h-[18px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition ${
          td.done ? 'bg-accent-green border-accent-green text-white' : 'border-ink/40 hover:border-accent-green'
        }`}
      >
        {td.done && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5 L4.8 9.2 L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div
        className={`flex-1 text-[15.5px] leading-snug cursor-text ${td.done ? 'line-through text-ink-faint' : 'text-ink/90'}`}
        contentEditable={editing}
        suppressContentEditableWarning
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onBlur={() => {
          setEditing(false);
          update({ text: val });
        }}
        onInput={(e) => setVal((e.target as HTMLElement).innerText)}
      >
        {td.text || '…'}
      </div>
    </div>
  );
}

// ---------------- drag / resize / selection wrapper ----------------

function DragLayer({
  block,
  page,
  children,
  onSelect,
  selected,
  editMode
}: {
  block: Block;
  page: Page;
  children: React.ReactNode;
  onSelect: () => void;
  selected: boolean;
  editMode: boolean;
}) {
  const { act } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; bx: number; by: number; moved: boolean } | null>(null);

  const pagePoint = (e: React.PointerEvent | PointerEvent) => {
    const el = document.querySelector(`[data-page="${page.id}"]`);
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const sx = r.width / PAGE_W;
    const sy = r.height / PAGE_H;
    return { x: (e.clientX - r.left) / sx, y: (e.clientY - r.top) / sy };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-no-drag]') || t.closest('[contenteditable]')) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    const p0 = { x: e.clientX, y: e.clientY };
    start.current = { x: p0.x, y: p0.y, bx: block.x, by: block.y, moved: false };
    const move = (ev: PointerEvent) => {
      if (!start.current) return;
      const dx = ev.clientX - start.current.x;
      const dy = ev.clientY - start.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) start.current.moved = true;
      if (editMode && start.current.moved) {
        const scale = PAGE_W / document.querySelector(`[data-page="${page.id}"]`)!.getBoundingClientRect().width;
        const nx = Math.round((start.current.bx + dx / scale) * 10) / 10;
        const ny = Math.round((start.current.by + dy / scale) * 10) / 10;
        act.updateBlock(page.id, block.id, { x: nx, y: ny });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      start.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // free drag rotation: angle from block center to the pointer (handle sits above the block)
  const onRotateDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const move = (ev: PointerEvent) => {
      const p = pagePoint(ev);
      const ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
      act.updateBlock(page.id, block.id, { rotate: Math.round(ang * 10) / 10 });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Google Docs-style resize: 8 handles (4 corners + 4 edges), works on rotated blocks
  const onResizeDown = (e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    onSelect();
    const p0 = pagePoint(e);
    const { x: x0, y: y0, w: w0, h: h0, rotate = 0 } = block;
    const rad = (rotate * Math.PI) / 180;
    // tracker grids need a minimum height so their content never spills past the block
    const MIN_W = 60;
    const MIN_H =
      block.type === 'year'
        ? 240 // the box-grid year (12 month rows + date header) must stay inside
        : block.type === 'table'
          ? 420 // header row + 31 day rows must stay inside
          : 40;
    const move = (ev: PointerEvent) => {
      const p = pagePoint(ev);
      const dx = p.x - p0.x;
      const dy = p.y - p0.y;
      // project the pointer delta into the block's local (unrotated) frame
      // (moving the anchor by the local delta is exact at 0° and a known approximation when rotated)
      const ldx = dx * Math.cos(rad) + dy * Math.sin(rad);
      const ldy = -dx * Math.sin(rad) + dy * Math.cos(rad);
      let nx = x0;
      let ny = y0;
      let nw = w0;
      let nh = h0;
      if (dir.includes('e')) nw = w0 + ldx;
      if (dir.includes('w')) {
        nw = w0 - ldx;
        nx = x0 + ldx;
      }
      if (dir.includes('s')) nh = h0 + ldy;
      if (dir.includes('n')) {
        nh = h0 - ldy;
        ny = y0 + ldy;
      }
      nw = Math.max(MIN_W, nw);
      nh = Math.max(MIN_H, nh);
      // keep the opposite edge fixed when clamping
      if (dir.includes('w') && nw === MIN_W) nx = x0 + (w0 - MIN_W);
      if (dir.includes('n') && nh === MIN_H) ny = y0 + (h0 - MIN_H);
      act.updateBlock(page.id, block.id, {
        x: Math.round(nx * 10) / 10,
        y: Math.round(ny * 10) / 10,
        w: Math.round(nw),
        h: Math.round(nh)
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const rot = block.rotate ?? 0;
  // resize handle positions (Google Docs style: white circles on corners & edges)
  const HANDLE =
    'data-no-drag pointer-events-auto absolute w-3 h-3 rounded-full bg-white border-2 border-ink/40 shadow-paper-sm z-10 transition-transform hover:scale-125 hover:border-accent-blue';
  const handleBtn = (dir: string, cls: string, cursor: string, title: string) => (
    <div
      data-no-drag
      onPointerDown={(e) => onResizeDown(e, dir)}
      className={`${HANDLE} ${cls}`}
      style={{ cursor, touchAction: 'none' }}
      title={title}
    />
  );

  return (
    <div
      ref={rootRef}
      data-block={block.id}
      className="absolute group"
      style={{
        left: block.x,
        top: block.y,
        width: block.w,
        height: block.h,
        transform: `rotate(${rot}deg)`,
        zIndex: selected ? 40 : 20
      }}
      onPointerDown={onPointerDown}
    >
      {children}
      {/* selection outline so the box edges are clearly visible */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-[3px] border-2 border-accent-blue/50" />
      )}
      {/* drag-to-rotate handle: a stem above the block's top edge (move mode only) */}
      {selected && editMode && (
        <div className="pointer-events-none absolute left-1/2 -top-9 -translate-x-1/2 flex flex-col items-center">
          <div
            data-no-drag
            onPointerDown={onRotateDown}
            className="pointer-events-auto w-3.5 h-3.5 rounded-full bg-white border-2 border-accent-blue shadow-paper-sm cursor-grab active:cursor-grabbing flex items-center justify-center"
            style={{ touchAction: 'none' }}
            title="Drag to rotate freely"
          >
            <div className="w-1 h-1 rounded-full bg-accent-blue" />
          </div>
          <div className="w-[2px] h-5 bg-accent-blue/60" />
        </div>
      )}
      {/* Google Docs-style resize handles (move mode only, so they never steal pen strokes) */}
      {selected && editMode && (
        <>
          {handleBtn('nw', '-left-1.5 -top-1.5', 'nwse-resize', 'Resize')}
          {handleBtn('n', 'left-1/2 -top-1.5 -translate-x-1/2', 'ns-resize', 'Resize height')}
          {handleBtn('ne', '-right-1.5 -top-1.5', 'nesw-resize', 'Resize')}
          {handleBtn('e', '-right-1.5 top-1/2 -translate-y-1/2', 'ew-resize', 'Resize width')}
          {handleBtn('se', '-right-1.5 -bottom-1.5', 'nwse-resize', 'Resize')}
          {handleBtn('s', 'left-1/2 -bottom-1.5 -translate-x-1/2', 'ns-resize', 'Resize height')}
          {handleBtn('sw', '-left-1.5 -bottom-1.5', 'nesw-resize', 'Resize')}
          {handleBtn('w', '-left-1.5 top-1/2 -translate-y-1/2', 'ew-resize', 'Resize width')}
        </>
      )}
      {(selected || editMode) && (
        <div className={`absolute -top-10 -right-2 z-20 flex gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              // ask the block's editable text to start editing (same as clicking the text)
              rootRef.current?.querySelector<HTMLElement>('[data-edit-target]')?.click();
            }}
            className="pointer-events-auto w-6 h-6 rounded-full bg-paper border border-ink/25 shadow-paper-sm flex items-center justify-center text-[11px] hover:bg-ink/10"
            title="Edit text"
          >
            ✏️
          </button>
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              const copy = {
                ...block,
                id: Math.random().toString(36).slice(2, 9),
                marks: block.marks ? { ...block.marks } : undefined,
                todos: block.todos ? block.todos.map((t) => ({ ...t })) : undefined,
                boxes: block.boxes ? block.boxes.map((b) => ({ ...b })) : undefined
              };
              act.addBlock(page.id, copy);
            }}
            className="pointer-events-auto w-6 h-6 rounded-full bg-paper border border-ink/25 shadow-paper-sm flex items-center justify-center text-[11px] hover:bg-ink/10"
            title="Duplicate"
          >
            ⧉
          </button>
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              act.updateBlock(page.id, block.id, { rotate: (block.rotate ?? 0) + 6 });
            }}
            className="pointer-events-auto w-6 h-6 rounded-full bg-paper border border-ink/25 shadow-paper-sm flex items-center justify-center text-[11px] hover:bg-ink/10"
            title="Rotate"
          >
            ⟳
          </button>
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              act.removeBlock(page.id, block.id);
            }}
            className="pointer-events-auto w-6 h-6 rounded-full bg-accent-red text-white shadow-paper-sm flex items-center justify-center text-[11px] hover:bg-accent-red/85"
            title="Delete"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- main switch ----------------

export default function BlockView({
  block,
  page,
  editMode,
  selected,
  onSelect
}: {
  block: Block;
  page: Page;
  editMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const renderInner = () => {
    switch (block.type) {
      case 'heading':
        return <HeadingBlock block={block} page={page} />;
      case 'section':
        return <SectionBlock block={block} page={page} />;
      case 'text':
        return <TextBlock block={block} page={page} />;
      case 'todo':
        return <TodoBlock block={block} page={page} />;
      case 'sticky':
        return <StickyBlock block={block} page={page} />;
      case 'divider':
        return (
          <div className="flex items-center gap-2 h-full">
            <svg width="100%" height="12" viewBox="0 0 380 12" preserveAspectRatio="none">
              <path d="M2 7 Q 60 2 120 6 T 240 6 T 378 5" stroke="#2c2a26" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.55" />
            </svg>
            {block.text && <span className="font-hand text-[16px] text-ink-soft whitespace-nowrap">{block.text}</span>}
            <svg width="100%" height="12" viewBox="0 0 380 12" preserveAspectRatio="none">
              <path d="M2 5 Q 60 9 120 6 T 240 6 T 378 7" stroke="#2c2a26" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.55" />
            </svg>
          </div>
        );
      case 'washi':
        return <Washi color={block.color ?? '#e0a96d'} className="w-full h-full" rotate={block.rotate ?? -3} />;
      case 'vertical':
        return <VerticalTracker block={block} pageId={page.id} />;
      case 'horizontal':
        return <HorizontalTracker block={block} pageId={page.id} />;
      case 'table':
        return <TableTracker block={block} pageId={page.id} />;
      case 'boxes':
        return <BoxesTracker block={block} pageId={page.id} />;
      case 'calendar':
        return <CalendarTracker block={block} pageId={page.id} />;
      case 'gcal':
        return <GCalTracker block={block} pageId={page.id} />;
      case 'weekly':
        return <WeeklyTracker block={block} pageId={page.id} />;
      case 'year':
        return <YearTracker block={block} pageId={page.id} />;
      case 'pattern':
        return <PatternTracker block={block} pageId={page.id} />;
      default:
        return null;
    }
  };

  return (
    <DragLayer block={block} page={page} onSelect={onSelect} selected={selected} editMode={editMode}>
      {renderInner()}
    </DragLayer>
  );
}
