# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI 現場知識驗收平台** (AI On-site Knowledge Assessment Platform) for 宏華國際 · 網路事業組織. A serverless web app where managers upload training materials, AI generates quizzes from them, and staff take those quizzes.

## Architecture

This is a **no-build, single-file frontend + Netlify Functions backend** project:

- `index.html` — the entire frontend: all HTML, CSS, and JavaScript in one file. No bundler, no framework. Vanilla JS with inline event handlers.
- `netlify/functions/api.js` — a single serverless function acting as two proxies:
  1. **Anthropic API proxy** — forwards request body directly to `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY` env var
  2. **Netlify Blobs proxy** — wraps `@netlify/blobs` for `blob_get`, `blob_set`, `blob_del`, `blob_list` actions (all data persistence goes through this)
- `netlify.toml` — publishes `.` as the static root, function bundler is `esbuild`

**Data flow**: `index.html` JS → `/.netlify/functions/api` (POST) → Anthropic or Blobs

## Two Modes

- **Demo mode**: any employee ID works, user manually selects role (staff/manager) and inputs an 8-character unit code (e.g. `DA240121`, first 5 = department, last 3 = team)
- **Strict mode**: headcount data is pre-loaded; identity and unit are auto-resolved from employee ID

## Roles

- **隊員 (Staff)**: takes quizzes assigned by their manager
- **主管 (Manager)**: uploads materials, creates AI-generated quizzes, publishes to teams, reviews results, accesses admin panel

## Manager Tabs

- **教材庫**: upload `.txt`, `.docx`, `.doc`, `.pdf`, images — AI reads content via vision/text extraction
- **出題**: generate quiz questions from selected materials using Claude
- **已發布**: manage published quiz sets
- **複查**: review staff results
- **管理** (admin only): hidden tab for admin operations

## Development & Deployment

There is no local dev server or build step. To develop:
- Open `index.html` directly in a browser for UI work (AI features show a warning banner: "本機開啟模式")
- For full functionality including AI quiz generation and data persistence, deploy to Netlify

Deploy via Netlify CLI:
```sh
npm install -g netlify-cli
netlify dev          # local dev with functions emulation
netlify deploy       # preview deploy
netlify deploy --prod  # production deploy
```

Set the environment variable `ANTHROPIC_API_KEY` in Netlify dashboard (Site settings → Environment variables). This is required for AI quiz generation to work.

## Key Constraints

- All state is stored in **Netlify Blobs** (keyed under the `platform` store) — there is no database
- The Anthropic API is called **server-side only** via the function; the API key is never exposed to the browser
- The function at `netlify/functions/api.js` handles both blob operations and AI proxying in a single handler — dispatching on `body.action` for blobs, and falling through to the Anthropic proxy otherwise
