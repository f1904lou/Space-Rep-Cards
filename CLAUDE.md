# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PromptForge** — A local-first web app that turns highlighted reading passages into high-quality spaced-repetition Q&A cards (Matuschak-style), with editing/curation and Mochi Cards export.

The full PRD is in the `README` file at the repo root.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build (tsc + vite build)
npx tsc --noEmit     # Type-check without emitting
```

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin; config is just `@import "tailwindcss"` in `src/index.css`)
- `idb` for IndexedDB persistence (database defined in `src/lib/db.ts`)

## Architecture

```
src/
  components/   — React components (TabNav, Workspace, DifficultySelector, SaveSourceBanner)
  hooks/        — Custom hooks (useSelection — tracks text selection in editor)
  lib/          — Utilities (db.ts — IndexedDB setup with "sources" and "cards" stores)
  types/        — TypeScript types (Source, Card, CardType, Difficulty)
  App.tsx       — Root component with tab routing (workspace / saved / settings)
```

- **Tab navigation**: State-based in `App.tsx`, no router. `TabNav` renders the tab bar.
- **Workspace**: `contentEditable` div for the editor. `useSelection` hook listens to `selectionchange` events and reports selected text + word count. Paste events trigger a "Save this source?" banner that persists to IndexedDB.
- **IndexedDB**: Two object stores — `sources` (keyPath: `id`) and `cards` (keyPath: `id`). Access via `getDB()` from `src/lib/db.ts`.

## Key Design Decisions

- **Selection-only generation**: Cards are generated from highlighted text selections, not full documents
- **Q&A only**: No cloze deletions, no multiple-choice
- **No invented examples**: Cards must be grounded in the selected text
- **Dual LLM support**: OpenAI and Anthropic APIs, switchable in settings
- **Local-first**: Runs in browser, no server required; IndexedDB for cards/sources, localStorage for settings
- **Card quality principles** (Matuschak-aligned): Focused, Precise, Consistent, Tractable, Effortful

## Data Model (src/types/index.ts)

- **CardType**: `"factual" | "conceptual" | "procedural" | "salience"`
- **Difficulty**: `"basic" | "medium" | "deep"`
- **Card mix by difficulty**: Basic (~70% factual), Medium (~50/50), Deep (~70% conceptual, max 1 salience)

## LLM Integration

- LLM must return strict JSON matching the schema in PRD section 8.1
- On invalid JSON: auto-retry once with repair instruction, then show raw output + copy button
- Selection max length configurable (10k–20k chars) with truncation warning
- System prompt, developer prompt, and user message template are defined in PRD section 8.3
