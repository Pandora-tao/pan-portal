# Pan Chat Floating Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nested pill-style composer with a single-layer floating glass control that has clearer focus, input, disabled, and multiline states.

**Architecture:** Keep all sending and keyboard behavior inside the existing `ChatInput.vue`. Use the form as the visual glass surface, make the textarea transparent, and use CSS `:focus-within` plus existing button disabled state so no new application state or event contract is required.

**Tech Stack:** Vue 3, TypeScript, CSS, Vite

---

### Task 1: Restructure The Composer Surface

**Files:**
- Modify: `packages/pan-chat/src/components/ChatInput.vue`
- Modify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Add explicit button state classes**

Update the submit button binding:

```vue
<button
  type="submit"
  :class="{ 'is-ready': canSend }"
  :disabled="!canSend"
  aria-label="发送消息"
>
```

This keeps the existing `canSend` business rule as the only source of button state.

- [x] **Step 2: Turn the form into the single glass surface**

Update `.composer` to align its children at the bottom, use a thin translucent border, a restrained shadow, and a `:focus-within` state:

```css
.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: end;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 64%);
  border-radius: 24px;
  background: rgb(255 255 255 / 56%);
  box-shadow:
    0 16px 38px rgb(20 20 24 / 11%),
    inset 0 1px 0 rgb(255 255 255 / 84%);
  backdrop-filter: blur(28px) saturate(135%);
}

.composer:focus-within {
  border-color: rgb(0 122 255 / 28%);
  background: rgb(255 255 255 / 68%);
  box-shadow:
    0 18px 42px rgb(20 20 24 / 12%),
    0 0 0 3px rgb(0 122 255 / 9%),
    inset 0 1px 0 rgb(255 255 255 / 92%);
}
```

- [x] **Step 3: Merge the textarea into the surface**

Remove the textarea border, white background, pill radius, and independent focus ring. Keep a stable minimum height and multiline growth:

```css
.composer textarea {
  min-height: 42px;
  max-height: 160px;
  padding: 10px 10px 9px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  box-shadow: none;
}

.composer textarea:focus {
  background: transparent;
  box-shadow: none;
}
```

- [x] **Step 4: Keep hints inside the input column**

Use compact internal spacing and prevent the hint from expanding the outer width:

```css
.composer-input-wrap {
  gap: 2px;
}

.composer-hint {
  padding: 0 10px 4px;
}
```

### Task 2: Refine The Send Button States

**Files:**
- Modify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Set a stable compact button size**

Use `42px` on desktop and `40px` on mobile. Align the button to the bottom of the form so it does not move when the textarea grows.

- [x] **Step 2: Define inactive and ready states**

The default disabled state uses a grey-blue translucent surface. `.is-ready` uses the existing system-blue gradient with a smaller shadow:

```css
.composer button {
  align-self: end;
  width: 42px;
  height: 42px;
  color: rgb(60 60 67 / 42%);
  background: rgb(120 130 145 / 13%);
}

.composer button.is-ready {
  color: #fff;
  background: linear-gradient(180deg, #2196ff, #007aff);
}
```

- [x] **Step 3: Preserve hover, active, disabled, and reduced-motion behavior**

Only `.is-ready:not(:disabled)` receives hover lift and active scale. Disabled buttons retain full structural opacity while using the inactive palette so the icon remains legible.

### Task 3: Verify Responsive Behavior

**Files:**
- Verify: `packages/pan-chat/src/components/ChatInput.vue`
- Verify: `packages/pan-chat/src/style.css`

- [x] **Step 1: Run static verification**

Run:

```bash
pnpm --filter @dragon-boat/pan-chat type-check
pnpm --filter @dragon-boat/pan-chat build
pnpm --filter @dragon-boat/pan-chat test
```

Expected: all commands exit 0 and the proxy test reports one passing test.

- [x] **Step 2: Verify desktop states**

At desktop width, inspect empty, focus, ready, and multiline states. Confirm the textarea has no independent white capsule and the button remains bottom-aligned.

- [x] **Step 3: Verify mobile states**

At `390x844`, inspect empty, focus, ready, and multiline states. Confirm there is no horizontal overflow, no overlap, and the composer remains above the bottom safe area.

- [x] **Step 4: Verify keyboard interactions**

Confirm Enter sends, Shift+Enter creates a newline, and the existing textarea auto-height still caps at `160px`.

- [x] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors and only the planned composer files plus existing uncommitted work and plan documents appear.
