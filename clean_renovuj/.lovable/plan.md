## Problem

`src/routes/index.tsx` is 3,033 lines because the same pieces are re-implemented inline in every step:

- **AskAI logic + UI duplicated 4×** in `FinancialsStep`, `UrgencyStep`, `CommunityStep`, `StakeholderStep` — each owns its own `question/asked/thinking/aiReply` state, `submitAi`, `closeChat`, a glass overlay dialog (~50 lines), and a pinned "Ask AI" pill bar (~25 lines). All four copies are byte-identical aside from the placeholder text. There's currently no single "Ask AI" bar — there are four, and they fight each other across step transitions.
- **Modal/overlay shell duplicated** — the glass `bg-background/30 backdrop-blur-xl` dialog with the floating close-X is reinvented for the AI chat (×4) and the persona detail in `StakeholderStep`.
- **Page shells are inconsistent** — `SplitShell` and `StepShell` exist, but `StakeholderStep` and `DistributionStep` still build their own `<section>` + `app-container` wrappers instead of using `StepShell`. `HeroStep`/`GoalsStep` also bypass the shell.
- **Two unused helpers** (`DefaultHouseFloating`, `DefaultHouseMobile`) are near-identical and only differ by `max-w`.
- **Runtime errors** (`Expected JSX closing tag` at 1326 / 1959) come from the half-finished SplitShell migration of `FinancialsStep` and `CommunityStep` — the stray closing tags exist precisely because the duplicated AskAI overlay was hand-pasted after `</SplitShell>`. Extracting the overlay fixes them as a side-effect.

## Plan

### 1. New shared primitives (single source of truth)

Create small, focused modules under `src/components/flow/`:

- **`AskAiProvider` + `useAskAi()`** (`ask-ai-context.tsx`)
  - One React context at the `LandingPage` root owns `question`, `asked`, `thinking`, `aiReply`, plus `ask(q)`, `close()`, and derived `chatOpen`.
  - Steps call `useAskAi()` instead of declaring their own state. Guarantees a single conversation, single open state, no cross-step leakage.

- **`AskAiBar`** (`ask-ai-bar.tsx`)
  - The pinned pill-shaped input form. Rendered **once** inside `LandingPage` (portaled via existing `AiPortal`) so every step shares the exact same bar. Takes an optional `placeholder` that each step can set via `useAskAi().setPlaceholder(...)` on mount.

- **`AskAiOverlay`** (`ask-ai-overlay.tsx`)
  - The glass dialog with the user bubble + Renovuj AI reply + thinking dots. Also rendered once at the root; reads from context.

- **`GlassDialog`** (`glass-dialog.tsx`)
  - Generic backdrop + centered card + floating close-X. Used by `AskAiOverlay` and the `StakeholderStep` persona detail. Props: `open`, `onClose`, `label`, `children`, `maxWidth`.

- **`SplitShell` / `StepShell`** — keep the existing API but:
  - Merge `DefaultHouseFloating` + `DefaultHouseMobile` into one `<HouseAsset variant="floating" | "mobile" />`.
  - `SplitShell` reads `chatOpen` from `useAskAi()` itself, so callers no longer pass it.
  - Add a `<PageHeader eyebrow title subtitle />` primitive for the eyebrow + display-font headline + lead paragraph repeated at the top of every step.

### 2. Step migrations

For each of `FinancialsStep`, `UrgencyStep`, `CommunityStep`, `StakeholderStep`:

1. Delete local `question/asked/thinking/aiReply/submitAi/closeChat/chatOpen` block.
2. Replace `<SplitShell chatOpen={chatOpen}>` with `<SplitShell>`.
3. Delete the trailing `<AiPortal> … overlay … AskAi bar … </AiPortal>` block (≈80 lines each).
4. Wrap the return in `<>` only if currently needed; otherwise just return `<SplitShell>`/`<StepShell>` directly. This removes the stray closing-tag syntax errors at 1326 and 1959.
5. Call `useAskAi().setPlaceholder("…step-specific question…")` in a `useEffect`.

`StakeholderStep` additionally swaps its inline persona modal for `<GlassDialog>`.

`HeroStep`, `GoalsStep`, `DistributionStep` move into `StepShell` for consistent padding/width.

### 3. Root wiring

In `LandingPage`:

```tsx
<AskAiProvider>
  <Header />
  <main>{currentStep}</main>
  <AskAiBar />        {/* the only one, ever */}
  <AskAiOverlay />    {/* the only one, ever */}
</AskAiProvider>
```

The bar can hide itself on Hero/Goals/Distribution via a `visibleOn` prop or by reading the active step from context.

### 4. Expected outcome

- `src/routes/index.tsx` shrinks by ~600 lines.
- Truly one AskAI bar and one overlay, with shared state — switching steps no longer resets the conversation or shows two bars momentarily.
- The two outstanding JSX syntax errors disappear because the duplicated trailing overlay blocks (their root cause) are removed.
- Future steps just write content + `useAskAi().setPlaceholder(...)`; they never reimplement chrome.

### Files touched

- New: `src/components/flow/ask-ai-context.tsx`, `ask-ai-bar.tsx`, `ask-ai-overlay.tsx`, `glass-dialog.tsx`, `page-header.tsx`, `house-asset.tsx`, `shells.tsx` (move `SplitShell`/`StepShell` out of the route file).
- Edited: `src/routes/index.tsx` (delete duplicated blocks, wire provider, migrate each step).

No behavior, copy, or visual design changes — purely structural deduplication.
