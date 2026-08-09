import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Washi tape decoration strip */
export function Washi({ color = '#e0a96d', className = '', rotate = -3 }: { color?: string; className?: string; rotate?: number }) {
  const patterns: Record<string, string> = {
    '#e0a96d': 'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 4px, transparent 4px 8px)',
    '#c0392b': 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0 3px, transparent 3px 6px)',
    '#3b6ea5': 'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0 2px, transparent 2px 6px)',
    '#3c7a4f': 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.3) 0 4px, transparent 4px 8px)',
    '#7c5cbf': 'repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 3px, transparent 3px 7px)'
  };
  return (
    <div
      className={`pointer-events-none absolute opacity-90 ${className}`}
      style={{
        background: `${patterns[color] ?? ''}, ${color}`,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        maskImage: 'linear-gradient(90deg, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 6%, black 94%, transparent)'
      }}
    />
  );
}

/** A modal with a paper/notebook look */
export function PaperModal({
  open,
  onClose,
  children,
  title,
  width = 560,
  z = 60
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  width?: number;
  z?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: z }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            className="relative paper-grid grain rounded-lg shadow-lift border border-ink/10 w-full max-h-[86vh] flex flex-col"
            style={{ maxWidth: width }}
            initial={{ y: 26, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            {title && (
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-ink/10">
                <div className="font-hand text-2xl text-ink">{title}</div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-ink/10 flex items-center justify-center text-ink-soft transition"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small tooltip */
export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-ink text-paper text-xs px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-paper-sm z-50">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
      </div>
    </div>
  );
}

/** Handwritten corner tag */
export function HandTag({ children, color = '#c0392b', className = '' }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={`font-hand font-semibold ${className}`} style={{ color }}>
      {children}
    </span>
  );
}

/** A button that looks hand-drawn */
export function HandButton({
  children,
  onClick,
  className = '',
  color = '#2c2a26'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0 border-2 ${className}`}
      style={{
        color,
        borderColor: color,
        background: 'rgba(255,255,255,0.35)',
        boxShadow: '0 2px 0 rgba(44,42,38,0.18)'
      }}
    >
      {children}
    </button>
  );
}

export function useClickOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onOut]);
  return ref;
}

export function useLongPress(cb: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      timer.current = window.setTimeout(cb, ms);
    },
    onPointerUp: () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    onPointerLeave: () => {
      if (timer.current) window.clearTimeout(timer.current);
    }
  };
}

export function useStateFlash<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [v, setV] = useState(initial);
  const flash = () => setV(initial);
  return [v, setV, flash];
}
