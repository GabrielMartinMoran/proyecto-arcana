# Repository contributor guide

This file applies to contributors and agents working in this repository. The
main focus is the web app; `foundryvtt-module/arcana` and `tools/` are separate
subprojects and need their own local context.

## Purpose and scope

Use this guide when you change the main repository. Treat the web app as the
default target unless the task explicitly points at a subproject.

- This guide is for day-to-day contributor and agent work in
  `proyecto-arcana`.
- Prioritize the web app in `src/`, `static/`, and `specs/`.
- Treat `foundryvtt-module/arcana` and `tools/` as separate subprojects, not
  extensions of the main app by default.

## Repo snapshot and stack

Keep stack descriptions factual and scoped to what exists today.

- Svelte 5 with runes
- SvelteKit 2 + Vite 7
- TypeScript 5
- Static deployment via `@sveltejs/adapter-static`
- The main `(app)` route tree behaves as a client-rendered SPA
  (`src/routes/(app)/+layout.ts` sets `ssr = false` there)
- Do not describe SSR as globally disabled for every route
- Vitest + Testing Library + jsdom
- ESLint + Prettier + svelte-check

## Architecture and key directories

The app uses a pragmatic service/component/model structure. Describe it as it
is, not as a fully separated Clean Architecture system.

- `src/routes/` — route composition
- `src/lib/components/` — feature UI and shared UI
- `src/lib/services/` — orchestration, data access, and sync boundaries
- `src/lib/types/` — domain models and classes
- `src/lib/factories/` — default object creation
- `src/lib/mappers/` — raw content to app/domain models
- `src/lib/constants/` — shared domain constants
- `src/lib/stores/` — global UI stores
- `src/lib/utils/` — helpers, browser utilities, calculators, serializers
- `static/docs/` — canonical runtime content consumed by the app
- `specs/` — Gherkin/spec artifacts
- `foundryvtt-module/arcana` — separate Foundry VTT subproject
- `tools/` — separate utility subprojects

## Working rules for contributors

Preserve existing behavior before introducing new abstractions or patterns.

- Follow existing local patterns before adding new abstractions.
- Use Svelte 5 runes consistently when editing Svelte files.
- Do not assume SSR or a server runtime in the main app. The app works as a SPA.
- Reutilize CSS styles and UI components whenever possible instead of creating new ones.
- Preserve newest-first ordering for PP and gold history.
- Preserve URL-synced UI state where it already exists.
- Don't be afraid to refactor, but use baby steps and preserve existing behavior. Clean code and clean architecture are MUSTs, not nice-to-haves, but they should be applied incrementally and pragmatically. Ensuring having tests that cover existing behavior before refactoring.

## Required local skills

Code changes in this repository must use the local skills that match the repo's
current conventions.

- `clean-code`
- `clean-architecture`
- `svelte-code-writer`

## Change planning and execution expectations

Prefer small changes that fit the current structure instead of redesigning the
app around new patterns.

- Keep changes small and scoped.
- Reuse existing services, types, factories, mappers, and UI patterns.
- Avoid ad hoc state duplication when a service, store, or model already owns a
  concern.
- If you touch markdown, YAML, or JSON content, keep it aligned with the runtime
  consumers that load it.

## Validation and completion expectations

Validation must match the change. Do not declare work complete without the
relevant checks.

- Run `npm run lint` for Prettier + ESLint.
- Run `npm run check` for Svelte/TypeScript validation.
- Run `npm run test` when the change affects behavior covered by tests or could
  plausibly regress runtime logic.
- Run `npm run format` when formatting fixes are needed.
- Run what is relevant to the change, but do not mark work complete without
  appropriate validation.
