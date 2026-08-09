import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../state/AppContext';
import { COVERS, PAPER_STYLES, PAGE_H, PAGE_W } from '../../types';
import { InkQuestLogo } from '../InkQuestLogo';
import PageView from './PageView';
import type { ShapeKind, Tool } from './CanvasPage';
import { Tip } from '../ui';
import { AchievementsModal, HabitsModal, MissionsModal, ShopModal, StatsModal, BASE_INKS, SHOP_ITEMS } from '../gamify/panels';
import LeaderboardModal from '../gamify/Leaderboard';
import AnalyticsView from '../analytics/AnalyticsView';
import Companion from '../pet/Companion';
import AiAssistant from '../ai/AiAssistant';
import Tour from '../guide/Tour';
import { levelProgress } from '../../lib/gamify';

type Panel = 'habits' | 'stats' | 'ach' | 'missions' | 'shop' | 'leaderboard' | null;

const TOOL_ICON: Record<string, React.ReactNode> = {
  move: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M10 3 V17 M3 10 H17 M6 6 L10 3 L14 6 M6 14 L10 17 L14 14 M3 10 L6 6 M3 10 L6 14 M17 10 L14 6 M17 10 L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  select: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2.4" />
      <circle cx="16" cy="4" r="2.2" fill="currentColor" />
    </svg>
  ),
  pen: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M4 16 L5 12 L14 3 L17 6 L8 15 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 5 L15 8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  pencil: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M13 3 L17 7 L7 17 L3 17 L3 13 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 4 L16 8 M8 12 L12 16" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 17 L6 17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  marker: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="10" width="14" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10 L6 7 Q 6 5 8 5 L12 5 Q 14 5 14 7 L14 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 15 L5 17 M15 15 L15 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  brush: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M15 3 L10 8 L13 11 L17 6 M9 9 L4 14 C3 15 4 16 5 16 C6 16 7 17 7 18 C7 19 9 19 9 18 L14 13 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  highlighter: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M6 9 L14 9 L14 13 L6 13 Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9 L5 13 M14 9 L15 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 16 H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  calligraphy: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M15 4 L7 12 L4 16 L8 13 L16 5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 12 L12 7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  eraser: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M6 16 L3 13 L12 4 L17 9 L12 16 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 4 L17 9 M8 12 L12 16 M3 13 L6 16" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  text: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M5 5 H15 M10 5 V15 M7 15 H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  sticky: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12 L12 4" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2" />
      <circle cx="14" cy="6" r="0.8" fill="currentColor" />
    </svg>
  ),
  shape: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="3.5" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
};

const SHAPE_LABEL: Record<ShapeKind, string> = { rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line', arrow: 'Arrow' };

const clampZoom = (z: number) => Math.min(3, Math.max(0.35, z));

export default function NotebookView() {
  const { state, act, currentNotebook, levelInfo, overallStreak, comboMult, todayDone, dueToday, undoHistory, lastSaved } = useApp();
  const dark = state.ui.dark;
  const companionOn = state.ui.companionOn;

  const pageIds = currentNotebook?.pages ?? [];
  const pages = pageIds.map((id) => state.snap.pages[id]).filter(Boolean);
  const pageCount = Math.max(1, pages.length);

  const [pageIdx, setPageIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('move');
  const [color, setColor] = useState('#2c2a26');
  const [size, setSize] = useState(4);
  const [straight, setStraight] = useState(false);
  const [shape, setShape] = useState<ShapeKind>('rect');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [coverOpen, setCoverOpen] = useState(false);
  const [rename, setRename] = useState(false);
  const [nameVal, setNameVal] = useState(currentNotebook?.name ?? '');
  const [tourOpen, setTourOpen] = useState(false);

  // ---- live XP burst: whenever XP rises, float a +N XP near the top bar ----
  const prevXp = useRef(state.snap.meta.xp);
  const [xpBurst, setXpBurst] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    const prev = prevXp.current;
    prevXp.current = state.snap.meta.xp;
    if (state.snap.meta.xp > prev) {
      setXpBurst({ n: state.snap.meta.xp - prev, key: Date.now() });
      const t = window.setTimeout(() => setXpBurst(null), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state.snap.meta.xp]);

  // ---- first-run guide: auto-start unless the user has seen it ----
  useEffect(() => {
    const v = localStorage.getItem('inkquest-tour');
    if (v === null || v === 'pending') {
      const t = window.setTimeout(() => setTourOpen(true), 700);
      return () => window.clearTimeout(t);
    }
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [fit, setFit] = useState(0.55);
  const [zoom, setZoom] = useState(1);

  const page = pages[pageIdx];
  const renderScale = fit * zoom;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // fit pages to the scroll-column width (continuous GoodNotes-style scroll)
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFit(Math.max(0.3, Math.min((r.width - 120) / PAGE_W, 1.2)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawerOpen, companionOn]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const prevPageCount = useRef(pageCount);
  useEffect(() => {
    // when pages are deleted, keep the scroll in sync with the clamped index
    if (pageCount < prevPageCount.current) {
      const n = Math.min(pageIdx, pageCount - 1);
      setPageIdx(n);
      requestAnimationFrame(() => slotRefs.current[n]?.scrollIntoView({ block: 'center' }));
    }
    prevPageCount.current = pageCount;
  }, [pageCount, pageIdx]);

  useEffect(() => {
    setFocusedId(page?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // keyboard nav (continuous scroll) + ctrl-wheel zoom
  const scrollToPage = (i: number) => {
    const el = slotRefs.current[i];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (pageIdx < pageCount - 1) scrollToPage(pageIdx + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (pageIdx > 0) scrollToPage(pageIdx - 1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, pageCount]);

  // keep the active page in sync with what is centered in the scroll viewport
  const trackActive = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const mid = sc.getBoundingClientRect().top + sc.clientHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    slotRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== pageIdx) setPageIdx(best);
  }, [pageIdx]);

  // ctrl / cmd + scroll to zoom the page
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const premiumInks = SHOP_ITEMS.filter((i) => i.kind === 'ink');
  const palette = [...BASE_INKS, ...premiumInks.filter((i) => state.snap.meta.unlocked.includes(i.id)).map((i) => i.value)];
  const lockedInks = premiumInks.filter((i) => !state.snap.meta.unlocked.includes(i.id));

  const nav = (d: number) => {
    const next = pageIdx + d;
    if (next < 0 || next >= pageCount) return;
    scrollToPage(next);
  };

  return (
    <div className={`h-full flex flex-col ${dark ? 'bg-[#1d1e22]' : 'bg-[#e9e2d0]'} transition-colors`}>
      {/* ---------- top bar ---------- */}
      <div className="flex items-center gap-2.5 px-3 py-2 bg-[#2d2a26] text-paper shadow-md z-30 flex-wrap">
        <Tip label="InkQuest — gamify your life (back to shelf)">
          <button onClick={() => act.openNotebook(null)} className="flex items-center rounded-lg hover:bg-paper/10 px-1.5 py-1 transition" title="InkQuest">
            <InkQuestLogo size={22} className="shrink-0" />
          </button>
        </Tip>
        <Tip label="Back to shelf">
          <button onClick={() => act.openNotebook(null)} className="flex items-center gap-1.5 rounded-lg hover:bg-paper/10 px-2.5 py-1.5 text-sm transition">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Shelf
          </button>
        </Tip>

        <div className="relative flex items-center gap-2">
          <svg width="18" height="22" viewBox="0 0 18 22" fill="none" className="shrink-0">
            <rect x="1" y="1" width="16" height="20" rx="2" fill={COVERS.find((c) => c.key === currentNotebook?.cover)?.color ?? '#2d2a26'} stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <path d="M3 6 H15 M3 10 H11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {rename ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => {
                setRename(false);
                if (nameVal.trim() && currentNotebook) act.renameNotebook(currentNotebook.id, nameVal.trim());
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="bg-transparent border-b border-paper/40 font-semibold text-sm w-36"
            />
          ) : (
            <button onClick={() => { setNameVal(currentNotebook?.name ?? ''); setRename(true); }} className="font-semibold text-[15px] hover:text-accent-amber transition text-left">
              {currentNotebook?.name}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setCoverOpen((o) => !o)} className="rounded-md hover:bg-paper/10 px-1.5 py-1 text-paper/60 hover:text-paper text-[11px] transition">
              cover ▾
            </button>
            {coverOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl bg-paper text-ink shadow-lift p-2.5 grid grid-cols-3 gap-2">
                {COVERS.map((c) => {
                  const paid = !['ink', 'paper'].includes(c.key);
                  const owned = !paid || state.snap.meta.unlocked.includes(`cover-${c.key}`);
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        if (!owned) {
                          setCoverOpen(false);
                          setPanel('shop');
                          return;
                        }
                        if (currentNotebook) act.setCover(currentNotebook.id, c.key);
                        setCoverOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-ink/10 transition"
                    >
                      <div className="w-11 h-14 rounded-md shadow-paper-sm" style={{ background: c.color }} />
                      <span className="text-[9.5px] text-center leading-tight">
                        {owned ? c.label : `🔒 ${c.label}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* XP strip — every gain is animated live */}
        <div data-tour="xp" className="relative flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 shadow-paper-sm">
          <span className="font-hand text-[17px] text-accent-red font-bold whitespace-nowrap">LV <LiveNum value={levelInfo.level} /></span>
          <div className="w-28 h-2 rounded-full bg-ink/10 overflow-hidden relative">
            <motion.div
              className="h-full rounded-full bg-accent-red"
              animate={{ width: `${Math.min(100, levelInfo.pct)}%` }}
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>
          <span className="text-[10px] text-ink-faint tabular-nums whitespace-nowrap">
            <LiveNum value={levelInfo.cur} />/{levelInfo.need} XP
          </span>
          <AnimatePresence>
            {xpBurst && (
              <motion.div
                key={xpBurst.key}
                initial={{ opacity: 0, y: 6, scale: 0.7 }}
                animate={{ opacity: 1, y: -10, scale: 1.15 }}
                exit={{ opacity: 0, y: -22, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="absolute -top-3 right-2 text-accent-amber font-bold text-[13px] pointer-events-none drop-shadow-sm"
              >
                +{xpBurst.n} XP
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="rounded-lg bg-paper/10 px-2 py-1 tabular-nums" title="INK currency">🖋️ <LiveNum value={state.snap.meta.ink} /></span>
          <span className="rounded-lg bg-paper/10 px-2 py-1 tabular-nums" title="Consistency streak">🔥 <LiveNum value={overallStreak} />d</span>
          <span className="rounded-lg bg-paper/10 px-2 py-1 tabular-nums" title="Habits done today">✅ <LiveNum value={todayDone} />/{dueToday}</span>
          {comboMult > 1 && <span className="rounded-lg bg-accent-red/20 px-2 py-1 text-accent-amber font-semibold" title="Combo multiplier">×{comboMult.toFixed(2)}</span>}
          <span
            key={lastSaved ?? 'init'}
            className="ml-1 flex items-center gap-1 rounded-lg bg-paper/10 px-2 py-1 text-[10px] tabular-nums text-paper/60"
            title="Everything autosaves to this device — reloading keeps your work"
          >
            {lastSaved ? (
              <>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 6.5 L4.5 9.5 L10.5 2.5" stroke="#6fbf73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                saved
              </>
            ) : (
              <>saving…</>
            )}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <TopBtn label="Pages" onClick={() => setDrawerOpen((o) => !o)}>{drawerOpen ? '📖' : '📕'}</TopBtn>
          <TopBtn label="Habits" tour="habits" onClick={() => setPanel('habits')}>✍️</TopBtn>
          <TopBtn label="Character sheet" onClick={() => setPanel('stats')}>📊</TopBtn>
          <TopBtn label="Achievements" onClick={() => setPanel('ach')}>🏆</TopBtn>
          <TopBtn label="Leaderboard" onClick={() => setPanel('leaderboard')}>🏅</TopBtn>
          <TopBtn label="Daily missions" tour="missions" onClick={() => setPanel('missions')}>☑️</TopBtn>
          <TopBtn label="Ink shop" onClick={() => setPanel('shop')}>🛍️</TopBtn>
          <TopBtn label="Analytics" onClick={() => setAnalyticsOpen(true)}>📈</TopBtn>
          <TopBtn label="Inky AI — Groq assistant" onClick={() => setAiOpen(true)}>🤖</TopBtn>
          <TopBtn label={companionOn ? 'Hide companion' : 'Show companion'} onClick={() => act.setCompanion(!companionOn)}>🦊</TopBtn>
          <TopBtn label={dark ? 'Light mode' : 'Dark mode'} onClick={() => act.setDark(!dark)}>{dark ? '☀️' : '🌙'}</TopBtn>
          <div className="w-px h-5 bg-white/15 mx-1" />
          <TopBtn label="Guide — replay the tour" tour="guide" onClick={() => setTourOpen(true)}>❓</TopBtn>
        </div>
      </div>

      {/* ---------- main ---------- */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {drawerOpen && <PagesDrawer pages={pages} />}

        <div ref={stageRef} className="flex-1 relative flex flex-col min-w-0">
          <div
            ref={scrollRef}
            onScroll={trackActive}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth"
          >
            <div className="flex flex-col items-center gap-14 py-14 px-10">
              {pages.map((p, i) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  className="relative shrink-0"
                  style={{
                    width: PAGE_W * renderScale,
                    height: PAGE_H * renderScale,
                    contain: 'layout',
                    contentVisibility: 'auto',
                    containIntrinsicSize: `${Math.round(PAGE_W * renderScale)}px ${Math.round(PAGE_H * renderScale)}px`
                  }}
                >
                  <div style={{ transform: `scale(${renderScale})`, transformOrigin: 'top left', width: PAGE_W, height: PAGE_H }}>
                    <PageView
                      page={p}
                      tool={tool}
                      color={color}
                      size={size}
                      straight={straight}
                      shape={shape}
                      interactive
                      active={focusedId === p.id}
                      onFocused={() => setFocusedId(p.id)}
                      pageNumber={i + 1}
                    />
                  </div>
                </div>
              ))}
              {pages.length === 0 && (
                <div
                  className="relative shrink-0"
                  style={{ width: PAGE_W * renderScale, height: PAGE_H * renderScale }}
                >
                  <div style={{ transform: `scale(${renderScale})`, transformOrigin: 'top left', width: PAGE_W, height: PAGE_H }}>
                    <EmptyPage onAdd={() => act.addPage(currentNotebook!.id)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* zoom controls */}
          <div data-tour="zoom" className="absolute bottom-3 right-4 z-50 flex items-center gap-0.5 rounded-full bg-[#2d2a26] px-1.5 py-1.5 shadow-lift select-none">
            <button
              onClick={() => setZoom((z) => clampZoom(z / 1.25))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-paper/80 hover:text-paper hover:bg-white/10 transition text-[15px] leading-none"
              title="Zoom out (Ctrl+scroll)"
            >
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              className="min-w-[52px] h-7 px-1 rounded-full text-[11px] font-semibold text-paper/90 hover:bg-white/10 transition tabular-nums"
              title="Reset zoom to fit page (click)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => clampZoom(z * 1.25))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-paper/80 hover:text-paper hover:bg-white/10 transition text-[15px] leading-none"
              title="Zoom in (Ctrl+scroll)"
            >
              +
            </button>
          </div>

          {/* page indicator */}
          <div className="absolute bottom-3 left-4 z-50 rounded-full bg-[#2d2a26]/90 px-3 py-1.5 text-paper/80 text-[11px] shadow-paper-sm pointer-events-none tabular-nums">
            Page {pageIdx + 1} of {pages.length || 1}
          </div>

          {/* text / sticky tool hint */}
          {(tool === 'text' || tool === 'sticky') && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#2d2a26] text-paper/90 text-xs px-3.5 py-1.5 shadow-paper-sm pointer-events-none whitespace-nowrap">
              {tool === 'text' ? 'Click anywhere on the page and start typing ✍️' : 'Click anywhere to drop a sticky note 📌'}
            </div>
          )}

          {/* nav arrows */}
          <button
            onClick={() => nav(-1)}
            disabled={pageIdx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-14 rounded-l-xl bg-[#2d2a26] text-paper/80 hover:text-paper disabled:opacity-25 flex items-center justify-center transition shadow-paper-sm"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            onClick={() => nav(1)}
            disabled={pageIdx >= pageCount - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-14 rounded-r-xl bg-[#2d2a26] text-paper/80 hover:text-paper disabled:opacity-25 flex items-center justify-center transition shadow-paper-sm"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M8 4 L14 10 L8 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {companionOn && <Companion onClose={() => act.setCompanion(false)} />}
      </div>

      {/* ---------- toolbar ---------- */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        straight={straight}
        setStraight={setStraight}
        shape={shape}
        setShape={setShape}
        palette={palette}
        lockedInks={lockedInks}
        onLockedInk={() => setPanel('shop')}
        onUndo={undoHistory.undo}
        onRedo={undoHistory.redo}
        canUndo={undoHistory.canUndo}
        canRedo={undoHistory.canRedo}
      />

      {/* ---------- modals ---------- */}
      <HabitsModal open={panel === 'habits'} onClose={() => setPanel(null)} />
      <StatsModal open={panel === 'stats'} onClose={() => setPanel(null)} />
      <LeaderboardModal open={panel === 'leaderboard'} onClose={() => setPanel(null)} />
      <AchievementsModal open={panel === 'ach'} onClose={() => setPanel(null)} />
      <MissionsModal open={panel === 'missions'} onClose={() => setPanel(null)} />
      <ShopModal open={panel === 'shop'} onClose={() => setPanel(null)} />
      <AnimatePresence>{analyticsOpen && <AnalyticsView onClose={() => setAnalyticsOpen(false)} />}</AnimatePresence>
      <AiAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
      <Tour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

// number that pops when it changes — every stat feels live
function LiveNum({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.45 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 380 }}
      className={`inline-block ${className ?? ''}`}
    >
      {value}
    </motion.span>
  );
}

function TopBtn({ label, onClick, children, tour }: { label: string; onClick: () => void; children: React.ReactNode; tour?: string }) {
  return (
    <Tip label={label}>
      <button data-tour={tour} onClick={onClick} className="w-8 h-8 rounded-lg hover:bg-paper/10 flex items-center justify-center text-[15px] transition">
        {children}
      </button>
    </Tip>
  );
}

function EmptyPage({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="paper-ruled grain rounded-[3px] shadow-paper flex flex-col items-center justify-center gap-3" style={{ width: PAGE_W, height: PAGE_H }}>
      <div className="font-hand text-3xl text-ink-faint">a blank page…</div>
      <button onClick={onAdd} className="rounded-xl bg-ink text-paper px-5 py-2 text-sm font-semibold shadow-paper-sm hover:bg-ink/85 transition active:scale-95">
        + Add your first page
      </button>
    </div>
  );
}

function PagesDrawer({ pages }: { pages: { id: string; title: string; paper: string; bookmarked?: boolean }[] }) {
  const { act, currentNotebook } = useApp();
  const nb = currentNotebook!;
  return (
    <div className="w-60 shrink-0 bg-[#efe9da] dark:bg-[#26262a] border-r border-black/10 dark:border-white/5 flex flex-col overflow-hidden z-10">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/10 dark:border-white/10">
        <span className="font-hand text-xl text-ink dark:text-paper">Pages</span>
        <button onClick={() => act.addPage(nb.id)} className="rounded-lg bg-accent-red text-white w-7 h-7 flex items-center justify-center text-sm hover:bg-accent-red/85 transition" title="Add page">
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {pages.map((p, i) => (
          <div key={p.id} className={`group rounded-lg px-2 py-1.5 border transition ${p.bookmarked ? 'border-accent-red/30 bg-accent-red/5' : 'border-transparent hover:border-ink/10 hover:bg-ink/5'}`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-ink-faint tabular-nums w-5">{i + 1}</span>
              <PageTitle pageId={p.id} title={p.title} />
              <button onClick={() => act.toggleBookmark(p.id)} className={`text-xs transition ${p.bookmarked ? 'text-accent-red' : 'text-ink-faint opacity-0 group-hover:opacity-100'}`} title="Bookmark">
                ★
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1 pl-6">
              <select
                value={p.paper}
                onChange={(e) => act.updatePage(p.id, { paper: e.target.value as never })}
                className="text-[10px] bg-transparent border border-ink/15 dark:border-white/15 rounded px-1 py-0.5 text-ink-soft dark:text-paper/70"
                title="Paper style"
              >
                {PAPER_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <MiniBtn label="Move up" onClick={() => i > 0 && act.movePage(nb.id, i, i - 1)}>↑</MiniBtn>
                <MiniBtn label="Move down" onClick={() => i < pages.length - 1 && act.movePage(nb.id, i, i + 1)}>↓</MiniBtn>
                <MiniBtn label="Split — move the lower half to a new page" onClick={() => act.splitPage(nb.id, p.id)}>✂</MiniBtn>
                <MiniBtn label="Duplicate" onClick={() => act.duplicatePage(nb.id, p.id)}>⧉</MiniBtn>
                <MiniBtn label="Delete" danger onClick={() => act.deletePage(nb.id, p.id)}>✕</MiniBtn>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-black/10 dark:border-white/10">
        <button onClick={() => act.addPage(nb.id)} className="w-full rounded-lg border-2 border-dashed border-ink/20 dark:border-white/20 text-ink-soft dark:text-paper/60 text-xs py-2 hover:border-accent-red/50 transition">
          + New page
        </button>
      </div>
    </div>
  );
}

function MiniBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <Tip label={label}>
      <button onClick={onClick} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center ${danger ? 'text-accent-red hover:bg-accent-red/10' : 'text-ink-faint hover:bg-ink/10'} transition`}>
        {children}
      </button>
    </Tip>
  );
}

// click a page title in the drawer to rename it
function PageTitle({ pageId, title }: { pageId: string; title: string }) {
  const { act } = useApp();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);

  const commit = () => {
    setEditing(false);
    const v = val.trim();
    if (v && v !== title) act.updatePage(pageId, { title: v });
    else setVal(title);
  };

  return editing ? (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 rounded border border-accent-red/50 bg-white/60 px-1 py-0.5 text-[13px] font-medium text-ink dark:text-paper outline-none"
    />
  ) : (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setVal(title);
        setEditing(true);
      }}
      title="Click to rename page"
      className="flex-1 min-w-0 truncate text-left text-[13px] font-medium text-ink dark:text-paper hover:text-accent-red transition-colors"
    >
      {title}
    </button>
  );
}

// ---------------- toolbar ----------------
function Toolbar({
  tool, setTool, color, setColor, size, setSize, straight, setStraight, shape, setShape, palette, lockedInks, onLockedInk, onUndo, onRedo, canUndo, canRedo
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (n: number) => void;
  straight: boolean;
  setStraight: (b: boolean) => void;
  shape: ShapeKind;
  setShape: (s: ShapeKind) => void;
  palette: string[];
  lockedInks: { id: string; value: string; price: number }[];
  onLockedInk: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const groups: { tools: Tool[] }[] = [
    { tools: ['move', 'select'] },
    { tools: ['pen', 'pencil', 'marker', 'brush', 'highlighter', 'calligraphy'] },
    { tools: ['eraser', 'text', 'sticky', 'shape'] }
  ];
  return (
    <div className="relative z-20 flex justify-center px-3 pb-2.5">
      <div className="flex items-center gap-1 rounded-2xl bg-[#2d2a26] px-2.5 py-1.5 shadow-lift flex-wrap justify-center max-w-[98vw]">
        {groups.map((g, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="w-px h-6 bg-white/15 mx-1" />}
            {g.tools.map((t) => (
              <Tip key={t} label={t[0].toUpperCase() + t.slice(1)}>
                <button
                  data-tour={t === 'pen' ? 'pen' : undefined}
                  onClick={() => setTool(t)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${tool === t ? 'bg-paper text-ink shadow-paper-sm' : 'text-paper/70 hover:text-paper hover:bg-white/10'}`}
                >
                  {TOOL_ICON[t]}
                </button>
              </Tip>
            ))}
          </React.Fragment>
        ))}

        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* shapes (when shape tool) */}
        {tool === 'shape' && (
          <>
            {(['rect', 'ellipse', 'line', 'arrow'] as ShapeKind[]).map((s) => (
              <Tip key={s} label={SHAPE_LABEL[s]}>
                <button
                  onClick={() => setShape(s)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold transition ${shape === s ? 'bg-paper text-ink' : 'text-paper/70 hover:bg-white/10'}`}
                >
                  {s === 'rect' ? '▭' : s === 'ellipse' ? '◯' : s === 'line' ? '╱' : '➤'}
                </button>
              </Tip>
            ))}
            <div className="w-px h-6 bg-white/15 mx-1" />
          </>
        )}

        {/* straight ruler */}
        <Tip label={straight ? 'Straight lines: on' : 'Straight lines: off (ruler)'}>
          <button
            onClick={() => setStraight(!straight)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-[13px] transition ${straight ? 'bg-accent-red text-white' : 'text-paper/70 hover:bg-white/10'}`}
          >
            📏
          </button>
        </Tip>

        {/* colors */}
        <div className="flex items-center gap-1 px-1">
          {palette.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition hover:scale-110 ${color === c ? 'border-accent-red ring-2 ring-accent-red/40 scale-110' : 'border-white/25'}`}
              style={{ background: c }}
              title={c}
            />
          ))}
          {lockedInks.map((i) => (
            <Tip key={i.id} label="Premium ink — visit shop">
              <button onClick={onLockedInk} className="w-6 h-6 rounded-full border-2 border-white/25 relative overflow-hidden" style={{ background: i.value }}>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-black/45 text-white">🔒</span>
              </button>
            </Tip>
          ))}
        </div>

        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* size */}
        <Tip label="Stroke size">
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-paper/50 text-[10px]">size</span>
            <input type="range" min={1} max={26} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-20" />
          </div>
        </Tip>

        <div className="w-px h-6 bg-white/15 mx-1" />

        <Tip label={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo yet'}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${canUndo ? 'text-paper/70 hover:text-paper hover:bg-white/10' : 'text-paper/20 cursor-default'}`}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M7 4 L3 8 L7 12 M3 8 H12 A5 5 0 0 1 17 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </Tip>
        <Tip label={canRedo ? 'Redo (Ctrl+Shift+Z)' : 'Nothing to redo'}>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${canRedo ? 'text-paper/70 hover:text-paper hover:bg-white/10' : 'text-paper/20 cursor-default'}`}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M13 4 L17 8 L13 12 M17 8 H8 A5 5 0 0 0 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </Tip>
      </div>
    </div>
  );
}
