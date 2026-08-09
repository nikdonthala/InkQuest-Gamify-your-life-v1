# 🖋️ InkQuest — gamify your life

A hand-drawn habit notebook that **levels you up**. Every page is paper you can draw on,
every habit you mark earns XP in real time — streaks, combos, achievements, a weekly
leaderboard, and a companion pet that grows with you.

> **v1.0** · InkQuest · [Created by nikdonthala](https://github.com/nikdonthala)

---

## ✨ Features

- **Notebook pages** — dot grid, ruled, blank, grid paper with a spiral binding. Draw freehand
  with a fountain pen / pencil / marker / brush / highlighter, add sticky notes, headings,
  to-do lists and dividers.
- **Habit trackers** — habit table, monthly boxes, mini & Google-style calendars, weekly strips,
  pattern grids, and a **Year in Pixels** box grid (dates across the top, months down the side,
  switch years with ‹ ›).
- **Free-form blocks** — drag anywhere, resize with 8 Google-Docs-style handles, rotate by
  dragging the stem handle. Blocks never overlap.
- **Gamification engine** —
  - XP per habit (easy +5 · medium +15 · hard +30 · goal +50) with a combo multiplier for streaks
  - Levels, stat bars (Discipline, Knowledge, Health, Creativity, Focus, Mindfulness)
  - INK currency for the cosmetic shop (covers & premium inks)
  - Achievements / sticker wall, daily missions, monthly quests
  - **How to win:** Win a Day ☀️ · Win a Week 🌟 · Win a Streak 🔥 · Win the League 🥇 · Win the Game 🏆
- **Weekly leaderboard** — climb the XP ladder against a rotating cast of rivals.
- **Inky AI companion** — a Groq-powered coach that reads your notebook and helps you improve.
- **Offline-first** — everything autosaves to IndexedDB on your device. No accounts, no servers,
  no data ever leaves your browser (except when you chat with Inky).
- **PWA** — installable, works offline.

## 🚀 Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # typecheck + production build
npm run preview    # preview the build
```

The app is a static Vite + React PWA — no backend required for core features.

## 🤖 AI assistant (Inky) & API keys

Your Groq API key **never ships to the browser**. Production builds call a tiny serverless
proxy (`api/chat.mjs`) that holds the key server-side:

1. Add the key in Vercel: **Project → Settings → Environment Variables → `GROQ_API_KEY`**.
2. In local development you can either run `vercel dev` (uses the proxy) or set a dev-only
   `VITE_GROQ_API_KEY` in `.env.local` (⚠️ VITE_ variables are bundled — dev use only).

See [.env.example](.env.example).

## ☁️ Deploying

**Vercel** (recommended):

```bash
vercel            # preview deployment
vercel --prod     # production
```

**GitHub**:

```bash
git init && git add . && git commit -m "InkQuest v1.0.0"
gh repo create InkQuest-Gamify-your-life-v1 --public --source=. --push
```

## 🗂️ Project structure

```
src/
  lib/            # data model, persistence (IndexedDB), gamification engine, AI client
  state/          # global state, undo/redo, one-time layout migrations
  components/
    blocks/       # draggable blocks + habit tracker grids
    notebook/     # pages, canvas (fabric.js), toolbar
    gamify/       # habits, stats, achievements, missions, shop, leaderboard
    ai/           # Inky AI chat
  ...
api/chat.mjs      # Vercel serverless proxy for the AI
```

## 🛡️ Privacy

- All notebook data lives in your browser's IndexedDB — it never touches a server.
- Different people never see each other's data (there is no shared backend).
- The only network call is the optional Inky AI chat, and it goes through the serverless
  proxy so the API key stays hidden.

## 📜 License

MIT — free to use, fork and build on.

---

<div align="center">
  <sub>InkQuest v1.0 · gamify your life · <a href="https://github.com/nikdonthala">Created by nikdonthala</a></sub>
</div>
