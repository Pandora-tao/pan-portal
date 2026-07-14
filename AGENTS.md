# AGENTS.md

## Project Overview

This repository is a pnpm workspace for a Dragon Boat Festival activity site.

Workspace packages live under `packages/*`:

- `packages/portal`: the navigation portal app.
- `packages/lucky-draw`: the Dragon Boat Festival lucky draw app.
- `packages/pan-chat`: a chat/profile sub app with a small Node server.

The root `package.json` owns shared dependencies and workspace-level scripts. Individual package `package.json` files should generally keep only app-specific scripts.

## Package Manager

Use `pnpm` only.

Common commands from the repository root:

```bash
pnpm install
pnpm dev:all
pnpm dev:portal
pnpm dev:lucky-draw
pnpm dev:chat
pnpm type-check
pnpm build
```

Avoid adding dependencies inside package folders unless there is a clear package-specific reason. Prefer adding shared frontend/runtime dependencies to the root `package.json`.

## Dependencies And External Assets

- When a requirement would benefit from a new dependency or downloaded external asset, proactively propose it instead of silently reducing implementation quality.
- Before installing or downloading anything, explain its purpose, source, affected scope, and expected benefit, then obtain explicit user approval.
- Without approval, do not install dependencies or download assets.

## Local Apps And Routes

Current dev routing is portal-first:

- Portal dev server: `packages/portal`, port `666`.
- Lucky draw app: `packages/lucky-draw`, port `5173`, base `/lucky-draw/`.
- Chat app: `packages/pan-chat`, port `5174`, base `/chat/`.

Portal proxies sub app paths in `packages/portal/vite.config.ts`:

- `/lucky-draw` -> `http://127.0.0.1:5173`
- `/chat` -> `http://127.0.0.1:5174`

When developing the full site, use:

```bash
pnpm dev:all
```

Then use portal routes:

```txt
http://localhost:666/
http://localhost:666/lucky-draw/
http://localhost:666/chat/
```

If a port is already in use, do not silently change shared route assumptions. Check the relevant `vite.config.ts` and update this file if the project convention changes.

## Static Verification Files

Domain verification files that must be available at the site root should go in:

```txt
packages/portal/public/
```

Example:

```txt
packages/portal/public/f56f303d14f4d22fb87a9bc1e5668501.txt
```

Do not place these files under `src/assets`, because Vite will fingerprint bundled assets.

## Lucky Draw Notes

Important files:

- `packages/lucky-draw/src/data/activity.ts`: quiz questions, prizes, zongzi item metadata.
- `packages/lucky-draw/src/composables/useLuckyDraw.ts`: localStorage state, draw chances, quiz failure and advanced challenge score.
- `packages/lucky-draw/src/App.vue`: main flow orchestration.
- `packages/lucky-draw/src/components/*`: modal, animation, background, and draw-stage components.

Behavioral expectations:

- Basic entry questions are multiple choice and randomly selected from unanswered/failed state.
- Wrong basic answers show the Lulu punishment animation and then continue to another basic question until all are failed.
- If all basic questions are failed, show the exact message `友谊的小船已经翻了` and remove draw chances.
- Advanced challenge questions do not punish wrong answers. Correct answers add score for later use.
- Prize text includes the test-version disclaimer in the prize modal.

## Portal Notes

Important files:

- `packages/portal/src/App.vue`: portal navigation cards.
- `packages/portal/vite.config.ts`: dev port and proxy routes.
- `packages/portal/public/`: root-level static files served unchanged.

Portal navigation should use route paths such as `/lucky-draw/` and `/chat/`, not direct cross-port links, unless the user explicitly asks for port-based navigation.

## Chat App Notes

Important files:

- `packages/pan-chat/server/index.mjs`: server entry.
- `packages/pan-chat/src/App.vue`: chat frontend.
- `packages/pan-chat/data/profile.md`: profile data.
- `packages/pan-chat/vite.config.ts`: base `/chat/`.

The `dev` and `preview` scripts for this package run the Node server, not plain `vite`.

## Code Style

- Use Vue 3 with `<script setup lang="ts">`.
- Keep TypeScript strictness intact.
- Prefer existing UI patterns, colors, and component structure.
- Keep mobile layout in mind; this project is used from phone browsers.
- Use lucide icons when adding UI iconography.
- Keep text in Chinese where the user-facing product already uses Chinese.
- Avoid moving shared dependencies into child packages without a reason.

## Validation

Before finishing code changes, run the smallest relevant validation:

```bash
pnpm --filter @dragon-boat/portal type-check
pnpm --filter @dragon-boat/lucky-draw type-check
pnpm --filter @dragon-boat/pan-chat type-check
```

For cross-package or dependency changes, run:

```bash
pnpm type-check
pnpm build
```

Build warnings from Rollup about third-party `/* #__PURE__ */` comments in `@vueuse/core` have appeared before and were non-fatal.

## Git And Files

- Do not delete or overwrite user-created files unless explicitly requested.
- Do not commit generated `dist` outputs unless the user asks.
- Keep `.codex-logs` ignored.
- Existing screenshot artifacts may be present under `.codex-screenshots`; do not modify them unless the task is about screenshots or visual verification.
