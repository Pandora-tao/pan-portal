# Pan Chat Avatar And Thinking State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat header icon with Pan's avatar, simplify the initial state to a first-person introduction, and add a low-distraction GSAP thinking indicator.

**Architecture:** Reuse the portal avatar as a static Vite asset import in `App.vue`. Keep the empty state text-only. Render and animate the pending assistant state inside `MessageItem.vue`, where the component can own the GSAP context and cleanup without changing chat data or API behavior.

**Tech Stack:** Vue 3, TypeScript, Vite, GSAP, CSS

---

### Task 1: Reuse Pan Avatar In The Header

**Files:**
- Modify: `packages/pan-chat/src/App.vue`
- Modify: `packages/pan-chat/src/style.css`
- Reuse: `packages/portal/src/assets/pan-avatar.png`

- [x] **Step 1: Import the existing avatar asset**

Add this import in `App.vue`:

```ts
import avatarUrl from '../../portal/src/assets/pan-avatar.png'
```

Remove `MessageCircle` from the Lucide import.

- [x] **Step 2: Render the avatar**

Replace the icon inside `.app-mark` with:

```vue
<img :src="avatarUrl" alt="" />
```

- [x] **Step 3: Style the avatar crop**

Update `.app-mark` to hide overflow and use a neutral glass shadow. Add:

```css
.app-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [x] **Step 4: Run the type check**

Run: `pnpm --filter @dragon-boat/pan-chat type-check`

Expected: exit code 0 with no TypeScript errors.

### Task 2: Replace The Initial Prompt With A First-Person Introduction

**Files:**
- Modify: `packages/pan-chat/src/components/EmptyState.vue`
- Modify: `packages/pan-chat/src/components/MessageList.vue`
- Modify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Remove the empty-state icon**

Delete the Lucide import and `.empty-icon` markup from `EmptyState.vue`.

- [x] **Step 2: Supply the approved introduction**

Render `EmptyState` from `MessageList.vue` with:

```vue
<EmptyState
  description="你好，我是 Pan。这里是我的聊天空间，想聊什么都可以直接告诉我。"
/>
```

- [x] **Step 3: Make the title optional**

Change the title markup to:

```vue
<p v-if="title" class="empty-title">{{ title }}</p>
```

Remove the unused `.empty-icon` styles and tune `.empty-desc` for the standalone introduction.

- [x] **Step 4: Run the type check**

Run: `pnpm --filter @dragon-boat/pan-chat type-check`

Expected: exit code 0 with no TypeScript errors.

### Task 3: Add The GSAP Thinking Indicator

**Files:**
- Modify: `packages/pan-chat/src/components/MessageItem.vue`
- Modify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Add component-owned GSAP lifecycle**

Create a root ref and initialize a scoped `gsap.context()` in `onMounted`. When `message.status === 'pending'` and reduced motion is not requested, animate `.thinking-dot` elements with an infinite yoyo tween using `y`, `scale`, `autoAlpha`, and `stagger`. Revert the context in `onUnmounted`.

- [x] **Step 2: Render pending and completed states separately**

For pending messages render:

```vue
<div class="thinking-indicator" role="status" aria-label="正在思考">
  <span class="thinking-label">正在思考</span>
  <span class="thinking-dots" aria-hidden="true">
    <span v-for="index in 3" :key="index" class="thinking-dot"></span>
  </span>
</div>
```

Render `.message-text` for all other statuses.

- [x] **Step 3: Style a stable, low-distraction indicator**

Use a fixed dot size, inline flex layout, blue translucent dots, and `will-change: transform, opacity` only on the animated dots. Do not animate message card dimensions.

- [x] **Step 4: Run the complete frontend verification**

Run:

```bash
pnpm --filter @dragon-boat/pan-chat type-check
pnpm --filter @dragon-boat/pan-chat build
```

Expected: both commands exit 0.

### Task 4: Browser Verification

**Files:**
- Verify: `packages/pan-chat/src/App.vue`
- Verify: `packages/pan-chat/src/components/MessageList.vue`
- Verify: `packages/pan-chat/src/components/MessageItem.vue`
- Verify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Start or reuse the local pan-chat server**

Run: `pnpm --filter @dragon-boat/pan-chat dev`

Expected: the page is available at `http://localhost:5174/chat/` or the configured local port.

- [x] **Step 2: Verify the initial state**

Check desktop and mobile viewports for:

- Pan's avatar in the top-left glass frame.
- No initial-state icon.
- No “开始一段即时对话” text.
- The approved first-person introduction is readable without overlap.

- [x] **Step 3: Verify the thinking state**

Send a message and confirm:

- “正在思考” and three staggered dots appear while waiting.
- The dots animate without resizing the card.
- The indicator is replaced by response text.
- Header actions and the fixed mobile composer remain usable.

- [x] **Step 4: Review the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors and only the planned files are modified.
