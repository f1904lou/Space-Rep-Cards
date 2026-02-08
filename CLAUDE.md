# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Spaced Repetition Cards** — A local-first web app that turns highlighted reading passages into high-quality spaced-repetition Q&A cards (Matuschak-style), with editing/curation and Mochi Cards export.

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
- OpenAI API for card generation (called directly from browser)
- Dark mode UI throughout

## Architecture

```
src/
  components/   — React components
    TabNav.tsx            — Tab bar (Workspace / Saved Cards / Settings)
    Workspace.tsx         — Editor, selection detection, generate button, cards panel
    GeneratedCards.tsx    — Horizontal card display with edit/keep/save/regenerate
    SavedCards.tsx        — Library grouped by topic, edit, delete, export
    SaveSourceBanner.tsx  — Paste detection banner to save source to IndexedDB
    Settings.tsx          — OpenAI model + API key config, test connection
  hooks/
    useSelection.ts      — Tracks text selection in editor (selectionchange event)
  lib/
    db.ts                — IndexedDB setup ("sources" + "cards" stores), CRUD functions
    llm.ts               — OpenAI API caller, JSON parsing, retry logic
    prompts.ts           — System prompt, developer prompt, user message builder
  types/
    index.ts             — Source, Card, CardType
  App.tsx                — Root component with tab routing
```

### Key flows

- **Tab navigation**: State-based in `App.tsx`, no router.
- **Workspace**: `contentEditable` div. `useSelection` hook reports selected text + word count. Paste events trigger "Save this source?" banner. Generate button calls OpenAI via `llm.ts`, displays results in `GeneratedCards`.
- **Card generation**: `llm.ts` reads settings from localStorage, sends system/developer/user prompts to OpenAI with `response_format: json_object`. Parses returned JSON into Card objects. Auto-retries once on invalid JSON. Shows raw response + copy button on persistent failure.
- **Saved Cards**: Grouped by `topic` field (editable — click topic name to rename, updates all cards in group in IndexedDB). Cards are editable inline (auto-saves). Export to CSV or Markdown for Mochi import.
- **IndexedDB**: Two object stores — `sources` (keyPath: `id`) and `cards` (keyPath: `id`). Functions: `saveSource`, `saveCards`, `getAllCards`, `updateCard`, `deleteCards`.
- **Settings**: Model name + OpenAI API key stored in localStorage under key `promptforge_settings`. Test connection hits `/v1/models` endpoint.

## Key Design Decisions

- **OpenAI only** (Anthropic removed due to browser CORS limitations)
- **Selection-only generation**: Cards generated from highlighted text, not full documents
- **No difficulty selector**: Single balanced prompt (~50/50 factual + conceptual)
- **Q&A only**: No cloze deletions, no multiple-choice
- **No invented examples**: Cards must be grounded in the selected text
- **Topic grouping**: Cards have a `topic` field (LLM-generated, user-editable) used for grouping in Saved Cards
- **Selection length guard**: Max 15,000 chars with truncate option
- **Card quality principles** (Matuschak-aligned): Focused, Precise, Consistent, Tractable, Effortful

## Data Model (src/types/index.ts)

- **CardType**: `"factual" | "conceptual" | "procedural" | "salience"`
- **Card**: `{ id, source_id?, type, topic, question, answer, source_quote, inference, created_at, provider?, model? }`
- **Source**: `{ id, title, content, created_at, tags? }`

## LLM Prompts (src/lib/prompts.ts)

- **System prompt**: Sets the role as spaced-repetition expert, defines card quality principles
- **Developer prompt**: Hard constraints (selection-only, no examples, JSON schema), card mix rules, topic field instruction, strict output format
- **User message**: Title (optional) + selected text
- All prompts are in `src/lib/prompts.ts` — edit there to change generation behavior
