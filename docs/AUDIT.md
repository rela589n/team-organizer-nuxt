# Audit Report

This audit reviews the current Nuxt + TypeScript + Tailwind app to identify key problem areas, ranked by impact, with notes for readability, maintainability, consistency, performance, and bundle/build health.

## Summary of Findings (Ranked by Impact)

1. Large monolithic page component (organize.vue ~680 lines)
   - Symptoms: Multiple responsibilities (queue logic, drag-and-drop, layout, animation, controls) in a single SFC.
   - Impact: Hard to read/maintain, risky changes, limited reuse, makes testing difficult.
   - Opportunities: Extract self-contained UI elements (controls, team card, queue item) into typed components; isolate animation utilities.

2. Tooling baseline missing (ESLint/Prettier)
   - Symptoms: No .eslintrc or Prettier config; inconsistent minor styles possible across files.
   - Impact: Inconsistent code style, lower readability, potential for avoidable bugs.
   - Opportunities: Add ESLint + Prettier, standard Vue 3 + TS rules, editorconfig; wire npm scripts.

3. Styling standardization not codified
   - Symptoms: Tailwind is used consistently, but no tailwind.config present for content scanning (Purge) and theme extensions.
   - Impact: Possible larger CSS output than necessary; unclear customization strategy.
   - Opportunities: Add tailwind.config with content globs; document utility-first approach and patterns.

4. Dead code risk and drift
   - Symptoms: Some comments in organize.vue hint at legacy/unused computed (e.g., balancedTarget). Also, some UI confetti styles reference CSS variables set in JS at runtime; ensure they’re truly used.
   - Impact: Cognitive overhead and confusion.
   - Opportunities: Remove/encapsulate legacy pieces or mark as intentional with comments; keep potential experimental features behind small utilities.

5. Type safety good but can be more explicit
   - Symptoms: Types exist for Person and Team; a few `as any` for lookups in template.
   - Impact: Potential runtime surprises.
   - Opportunities: Provide mapping helpers to avoid `as any` in templates; leverage computed maps typed properly.

6. Accessibility and semantics
   - Symptoms: Many controls are accessible; color pickers include ARIA. Drag-and-drop interactions rely on native DnD; needs careful focus management.
   - Opportunities: Add keyboard support notes and small helpers; document patterns for interactive elements.

7. Performance and bundle/build health
   - Symptoms: Nuxt 4, Tailwind module present, no explicit tree-shaking issues observed. Purge config improves CSS size.
   - Opportunities: Split heavy components; memoize computed maps; avoid unnecessary watchers.

## Quick Wins
- Add ESLint/Prettier + scripts (done in this branch).
- Add Tailwind config with content globs (done).
- Start extracting UI atoms from organize.vue (SpeedControl extracted now).
- Add docs with patterns and checklist (this docs folder).

## Notes on i18n
- Custom composable useI18n is present and used consistently. Ensure messages coverage; document adding new keys.

## Risk Areas
- Refactoring organize.vue without stepwise extraction may break behaviors; prefer iterative extractions with unit interaction tests or visual test plan.
