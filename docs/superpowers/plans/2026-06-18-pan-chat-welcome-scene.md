# Pan Chat Welcome Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty chat state into an animated personal welcome scene with Pan's avatar, readable two-level copy, ambient glow, and subtle light dots.

**Architecture:** Keep the welcome scene self-contained in `EmptyState.vue`, including the existing portal avatar import and scoped GSAP lifecycle. `MessageList.vue` supplies the approved title and description, while `style.css` provides stable dimensions and responsive presentation without changing chat state or API contracts.

**Tech Stack:** Vue 3, TypeScript, GSAP, CSS, Vite

---

### Task 1: Build The Welcome Scene Structure

**Files:**
- Modify: `packages/pan-chat/src/components/EmptyState.vue`
- Modify: `packages/pan-chat/src/components/MessageList.vue`
- Reuse: `packages/portal/src/assets/pan-avatar.png`

- [x] **Step 1: Import the existing avatar and GSAP lifecycle APIs**

Add Vue mount/unmount refs, GSAP, and:

```ts
import avatarUrl from '../../../portal/src/assets/pan-avatar.png'
```

- [x] **Step 2: Render the visual hierarchy**

Render a `.welcome-portrait` containing two decorative glow layers and the avatar. Render the existing title and description as `.welcome-copy`, followed by three decorative `.welcome-dot` elements.

- [x] **Step 3: Split the approved copy**

Update `MessageList.vue` to pass:

```vue
title="你好，我是 Pan。"
description="这里是我的聊天空间，想聊什么都可以直接告诉我。"
```

### Task 2: Add Scoped GSAP Animation

**Files:**
- Modify: `packages/pan-chat/src/components/EmptyState.vue`

- [x] **Step 1: Create the scoped context on mount**

Use a root element ref and `gsap.context(callback, rootRef.value)`. Skip animation when `prefers-reduced-motion: reduce` matches.

- [x] **Step 2: Sequence the entrance**

Create a timeline that:

- expands `.welcome-glow` with `scale` and `autoAlpha`;
- brings in `.welcome-avatar` with `scale`, `y`, and `autoAlpha`;
- staggers `.empty-title` and `.empty-desc` upward;
- reveals `.welcome-dot` with a short stagger.

- [x] **Step 3: Start the ambient loops**

Create paused, infinite yoyo timelines for the glow and dots. Start them from the entrance timeline after the final reveal. Animate only `scale`, `y`, and `autoAlpha`.

- [x] **Step 4: Clean up on unmount**

Call `context.revert()` in `onUnmounted` so the entrance and infinite timelines stop when the first chat message removes the welcome scene.

### Task 3: Style The Welcome Scene

**Files:**
- Modify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Size the scene without adding a card**

Keep `.empty-state` centered and cap its visual height. Add stable portrait dimensions so animation cannot shift surrounding content.

- [x] **Step 2: Style the avatar and glow**

Use a circular avatar with a white glass border and restrained shadow. Use two absolutely positioned blue/cyan glow layers with low opacity and `pointer-events: none`.

- [x] **Step 3: Establish readable text hierarchy**

Use a stronger 20px title and a quieter 15px description with a controlled max width. Do not apply animated gradients or effects directly to text.

- [x] **Step 4: Add responsive dimensions**

At widths below 760px, reduce the portrait to about 64px, tighten gaps, and keep the whole welcome scene around 210px tall without horizontal overflow.

### Task 4: Verify Behavior

**Files:**
- Verify: `packages/pan-chat/src/components/EmptyState.vue`
- Verify: `packages/pan-chat/src/components/MessageList.vue`
- Verify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Run static checks**

Run:

```bash
pnpm --filter @dragon-boat/pan-chat type-check
pnpm --filter @dragon-boat/pan-chat build
pnpm --filter @dragon-boat/pan-chat test
```

Expected: all commands exit 0 and the proxy suite reports one passing test.

- [x] **Step 2: Verify desktop and mobile visuals**

Inspect `1200x843` and `390x844` viewports. Confirm the avatar, glow, two-level copy, dots, and composer do not overlap or create horizontal overflow.

- [x] **Step 3: Verify animation and cleanup**

Measure glow or dot transforms at two timestamps to confirm motion. Send a message and confirm `.empty-state` is removed and no welcome animation remains.

- [x] **Step 4: Verify reduced motion**

Emulate reduced motion and confirm the avatar, copy, and dots remain visible with unchanged transform and opacity across time.

- [x] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors and only the planned welcome files plus existing uncommitted work and plan documents appear.
