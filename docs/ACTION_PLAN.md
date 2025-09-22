# Action Plan (Prioritized Checklist with Effort Estimates)

Legend: S = Small (<2h), M = Medium (0.5–1 day), L = Large (2–3 days)

1) Tooling Baseline (S)
- Add ESLint + Prettier + EditorConfig and npm scripts (done).
- Share VSCode settings snippet for format-on-save (doc only).

2) Styling Standardization (S)
- Adopt Tailwind as the single source of truth. Avoid ad-hoc styles except scoped keyframes.
- Add tailwind.config with content globs (done).
- Document utility patterns (spacing, colors from team.color, semantic text sizes).

3) Refactor organize.vue Incrementally (M → L in total, do in small PRs)
- Extract UI atoms/molecules:
  - SpeedControl (done).
  - TeamCard (header + member list + drop handlers) (M).
  - QueueDisplay (staging + next items) (M).
  - PersonChip (avatar + name) (S).
- Extract computed helpers:
  - teamsMap (id → team), peopleMap (id → person) to remove `as any` (S).
  - animation helpers into utils/animation.ts (S).
- Separate drag-and-drop logic into a composable (useDragDrop) (M).

4) Type Tightening (S)
- Replace template `as any` by typed computed maps.
- Add narrow types for DOM refs used by animations.

5) Accessibility Pass (S)
- Confirm focus management during color picker and DnD.
- Add keyboard alternatives or doc the behavior.

6) Performance/Bundling (S → M)
- Ensure Tailwind purge is effective (config done).
- Defer expensive watchers; memoize maps.
- Lazy-load confetti util only when needed (dynamic import) (S).

7) Dead Code Removal (S)
- Remove or isolate `balancedTarget` and other legacy pieces if unused; otherwise document intent.

8) Testing & DX (M)
- Add minimal unit tests for composables (vitest) and a smoke E2E (playwright). Provide config in a follow-up PR.

## Suggested Milestones
- Milestone A (S): Tooling + Tailwind config + 1–2 atoms extracted.
- Milestone B (M): TeamCard + QueueDisplay refactor, typed maps.
- Milestone C (M): DnD composable + accessibility pass + tests.

## Risks and Mitigations
- Risk: Behavior drift during refactor → Do small PRs, visual QA checklist per PR.
- Risk: Build break from new tooling → Keep configs non-strict initially; tighten later.
