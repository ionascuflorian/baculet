# Băculeț – Agent Instructions

Băculeț is an educational platform for Romanian BAC preparation.

## Stack

- Next.js 16.2.x App Router
- React 19.2.x
- TypeScript
- PostgreSQL
- Prisma 7
- NextAuth 5 beta
- Vercel AI SDK 7
- Tailwind CSS 4
- Framer Motion
- BlockNote
- Zod

Use the versions installed in `package.json` and the documentation shipped in `node_modules` as the source of truth for version-sensitive APIs.

## Before changing code

1. Read this file.
2. Read `docs/agents/CONTEXT.md` when the task touches product/domain behavior or architecture.
3. Inspect the existing implementation and related Prisma models before adding new abstractions.
4. Search for existing helpers/actions/components before creating replacements.
5. For Next.js and AI SDK APIs, verify the locally installed version in `node_modules` before writing code.

## Non-negotiable architecture rules

- Do not introduce Supabase. The project uses Prisma + PostgreSQL.
- Do not replace Prisma, NextAuth, the AI SDK, or the existing editor/content pipeline unless explicitly requested.
- Do not create a second implementation of an existing domain concept such as lesson, progress, mastery, checkpoint, quiz, or learning path.
- Prefer extending existing modules over creating parallel systems.
- Preserve existing route/component conventions unless there is a concrete reason to refactor.
- Database schema changes require inspection of all affected relations, indexes, unique constraints, seed data, and migration impact.
- Never bypass authentication/authorization for convenience.
- Never expose server secrets to client code.
- Do not silently change existing user-facing behavior while implementing an unrelated feature.

## Educational model

The current domain model already contains:

Subject → Chapter → Unit → Lesson → LessonStep

and also Concepts, Quizzes, Checkpoints, attempts, unit/lesson progress, and concept mastery.

Treat the existing model as authoritative unless an explicit design change is agreed.

A checkpoint is an assessment/gate in the learning path; it is not a replacement for the lesson page.

## Product behavior

Băculeț should guide a student through a coherent learning loop:

Learn → Practice → Check understanding → Update progress/mastery → Recommend next action.

Do not add gamification or AI behavior merely because it is technically easy. It must support learning outcomes.

## UI rules

- Preserve the Băculeț visual identity.
- Prefer clear hierarchy and strong readability over excessive transparency or decorative effects.
- Reuse existing design tokens/components before introducing new ones.
- Keep mobile behavior intentional.
- Animations should communicate state, feedback, or progress; never distract from learning.
- Accessibility is a requirement, not a later polish step.

## AI rules

- Never write Vercel AI SDK code from memory. Inspect the installed package docs/source first.
- Keep AI provider selection and secrets server-side.
- Validate structured AI output with Zod where applicable.
- Add rate limiting and failure handling to user-triggered AI endpoints.
- AI answers should use explicit product/domain context instead of guessing about Băculeț data.

## Testing and verification

For critical behavior, prefer tests through public interfaces.

Critical paths include:

- authentication and authorization
- lesson/step completion
- checkpoint access and completion
- quiz scoring
- progress updates
- concept mastery updates
- learning-path next-action logic
- AI request validation and failure handling

After meaningful UI/flow changes, verify the real browser flow when possible.

## Development loop

After code changes, keep the local dev server available on port 3000 so the user can test immediately.

For production builds, stop the dev server first if required by the local environment, run the build, then restart development.

At deploy time, bump the version in `package.json`. Do not manually edit generated version files.

## Working style for agents

Before implementation:
- state the intended change and the affected areas
- identify existing modules that will be reused
- identify risks if schema or domain behavior changes

During implementation:
- make the smallest coherent change
- avoid speculative refactors
- keep domain logic out of purely presentational components

Before completion:
- run relevant lint/type/build/test checks available in the repository
- verify the affected browser flow where practical
- summarize changed files and any remaining risks
