import { useState } from 'react';
import type { Page } from '../../types';
import { PAGE_H, PAGE_W } from '../../types';
import BlockView from '../blocks/Block';
import BlockPicker from '../blocks/BlockPicker';
import CanvasPage, { type ShapeKind, type Tool } from './CanvasPage';

export default function PageView({
  page,
  tool,
  color,
  size,
  straight,
  shape,
  interactive,
  active,
  onFocused,
  pageNumber,
  spiral = true
}: {
  page: Page;
  tool: Tool;
  color: string;
  size: number;
  straight: boolean;
  shape: ShapeKind;
  interactive: boolean;
  active: boolean;
  onFocused: () => void;
  pageNumber: number;
  spiral?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const editMode = tool === 'move';

  return (
    <div
      data-page={page.id}
      className={`paper-${page.paper} grain relative rounded-[3px] shadow-paper shrink-0 no-drag`}
      style={{ width: PAGE_W, height: PAGE_H }}
      tabIndex={0}
      onPointerDownCapture={() => onFocused()}
      onKeyDown={(e) => {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
          const t = e.target as HTMLElement;
          if (!t.closest('[contenteditable]') && !t.closest('input')) {
            e.preventDefault();
            setPickerOpen(true);
          }
        }
      }}
    >
      {/* spiral wire binding on the right edge (notebook look) */}
      {spiral && (
        <div className="absolute right-0 top-0 bottom-0 w-[16px] pointer-events-none z-[5] flex flex-col items-center justify-evenly py-4 opacity-90">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="rounded-[3px] bg-[#232327] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.5)]"
              style={{ width: 11, height: 26 }}
            />
          ))}
        </div>
      )}

      {/* bookmark fold */}
      {page.bookmarked && (
        <div className="absolute -right-[2px] top-0 z-[45] pointer-events-none">
          <svg width="22" height="34" viewBox="0 0 22 34">
            <path d="M0 0 H22 V34 L11 26 L0 34 Z" fill="#c0392b" stroke="#8e2f24" strokeWidth="0.8" />
          </svg>
        </div>
      )}

      {/* blocks layer (above ink, below controls) */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 20, pointerEvents: editMode ? 'auto' : 'none' }}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (t === e.currentTarget || t.dataset.page === page.id) onFocused();
        }}
      >
        {page.blocks.map((b) => (
          <BlockView
            key={b.id}
            block={b}
            page={page}
            editMode={editMode}
            selected={selectedBlock === b.id}
            onSelect={() => setSelectedBlock(b.id)}
          />
        ))}
      </div>

      {/* drawing canvas */}
      <CanvasPage
        page={page}
        tool={tool}
        color={color}
        size={size}
        straight={straight}
        shape={shape}
        interactive={interactive}
        active={active}
        onFocused={onFocused}
      />

      {/* add-block floating button */}
      <div className="absolute bottom-3 right-5 z-[46]" onClick={(e) => e.stopPropagation()}>
        <button
          data-tour="add-block"
          onClick={() => setPickerOpen(true)}
          className="w-9 h-9 rounded-full bg-paper border-2 border-ink/30 shadow-paper-sm flex items-center justify-center text-ink-soft hover:text-accent-red hover:border-accent-red transition-all hover:scale-110"
          title="Add block (/)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2 V14 M2 8 H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* page number */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[46] font-hand text-[14px] text-ink-faint/70 pointer-events-none">
        {pageNumber}
      </div>

      <BlockPicker page={page} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
