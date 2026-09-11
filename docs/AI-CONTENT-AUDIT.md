# Băculeț Content Studio — Audit (Phase 0)

> Document de bază pentru construirea funcției de generare de conținut cu AI din admin.
> Scop: stabilește ce există deja în cod, ce se reutilizează, ce lipsește și cum se
> lipește sistemul nou `AI Content Studio` de arhitectura actuală fără duplicare.

Data auditului: 2026-09-10.
Stack-ul exact din `package.json` este sursa de adevăr pentru versiuni (Next.js 16.2.x, React 19.2.x, Prisma 7.x + `@prisma/adapter-pg`, NextAuth 5 beta, AI SDK ^7.0.48, zod v4).

---

## 1. Summary

Băculeț are deja un pipeline de conținut **manual** complet (Subject → Chapter → Unit → Lesson → LessonStep + Concept/Quiz/Question/Checkpoint) și două integrări AI admin izolate (generare exerciții, generare temă). Nu există:

- un concept de „proiect"/„bibliotecă de surse" pentru generare;
- stocare de fișiere (PDF/DOCX) — doar base64 pentru avatar (limită ~5MB);
- extragere de text din documente / chunking / retrieval;
- draft-uri tipărite, versiuni, validator AI, flow de aprobare înainte de publicare.

**Decizia de arhitectură:** Content Studio = sistem de *producție de conținut* care scrie DRAFT-uri în modele de staging și, la aprobare, publică în **modelele educaționale existente** prin tranzacții. Nu se creează modele paralele pentru conținutul live; studenții consumă doar sistemul existent.

## 2. Ce există în cod (inventar)

### 2.1 Ierarhia canonică și evaluarea (autoritare)

Vezi `docs/agents/CONTEXT.md`. Modelul curent:

```
Subject → Chapter → Unit → Lesson → LessonStep
```
plus `Concept`, `Quiz` (+`Question`), `Checkpoint`, `UnitType`(LESSON/RECAP/CHECKPOINT/DIAGNOSTIC),
progress per lesson/step/unit, `UserConceptProgress` (mastery), checkpoint attempts.

Regula de domeniu: **content ≠ practice ≠ assessment ≠ progress ≠ mastery** — Content Studio produce `content` (lecții/steps) și `practice/assessment` (quiz-uri, checkpoint), dar nu scrie progress/mastery.

### 2.2 Autentificare / autorizare

- `src/lib/access.ts`: `currentUser()`, `requireUser()`, `requireAdmin()` (throw), `isAdmin()`.
- Protecția strictă: `requireAdmin()` în server actions, `currentUser()+isAdmin()` în rutele API admin.

### 2.3 Acțiuni admin existente (`src/lib/actions/admin.ts`)

Pattern-ul canonic: `"use server"` + `requireAdmin()` + `schema.parse(input)` → payload validat,
operații Prisma (inclusiv `$transaction`), return `{ ok, error }` sau throw, `revalidatePath`.
Include deja:
- materii/subiecte: `saveSubject`, `saveChapter`, `getSubject`; eliminare cu verificare relații;
- lecții: `getLessonWithRelations`, `saveLesson` (+ `syncLessonSteps`);
- quiz-uri: `getOrCreateLessonQuiz` (upsert pe `subjectId_slug` fără gafă P2002), `createQuickQuiz`, `saveQuiz`;
- checkpoint: *nu există acțiune de creare din UI* (întrebările checkpoint-ului vin din quiz-urile unit/chapter — vezi `evaluateCheckpoint` în `src/lib/checkpoint.ts`).

`src/lib/lesson-steps.ts` conține obținerea/persistența pașilor (`syncLessonSteps`) reutilizabilă la publish.

### 2.4 Tipuri de secțiuni și forme de conținut

- `section-types.ts` (DESCOPERĂ / EXEMPLU / EXERSEAZĂ) — tipurile de LessonStep acceptate în constructor;
- `LessonEditor` (BlockNote) + `SectionForm` / `SectionConstructor` / `CourseMap` — pipeline-ul UI de editare manuală;
- `questionSchema` (API generate-exercises): `{ text, options[2..6], correctIndex, explanation?, type: SINGLE|CLOZE|FLASHCARD|DRAG_DROP }` — **același shape e folosit pentru întrebările din baza de date**.

### 2.5 Integrările AI existente

**Nu există un modul centralizat `src/lib/ai.ts`.** Fiecare rută configurează providerul inline:

| Ruta | API | Model |
|---|---|---|
| `api/siera/chat` | `streamText` (chat student) | `google()` + `SIERA_MODEL` (default `gemini-3.5-flash-lite`), cheie `GOOGLE_GENERATIVE_AI_API_KEY` |
| `api/admin/generate-exercises` | `generateObject` + `zod` | `getModel(provider, key)` switch pe `aiProvider` al adminului: openai→`gpt-4o-mini`, anthropic→`claude-3-5-haiku-latest`, google→`SIERA_MODEL` |
| `api/admin/generate-theme` | `streamText` | același `getModel` |

Cheile AI: per-admin pe `User.aiProvider` + `User.aiApiKeyEnc` (AES-256-GCM, cheie derivată din `AUTH_SECRET`/`CRON_SECRET` — `src/lib/ai-keys.ts`, `encryptApiKey/decryptApiKey/maskApiKey`). Fallback google: cheie din env. Dacă providerul e non-google și nu există cheie → 400 cu mesaj clar.

**Pattern de reutilizat** (extras în mare măsură identic din `generate-exercises/route.ts`):
1. `currentUser()` + `isAdmin` → 401;
2. citire `aiProvider`/`aiApiKeyEnc`, `decryptApiKey`, fallback env pentru google;
3. `generateObject({ model, schema: zodSchemas, system, prompt })` (schema din `zod/v4`);
4. bugetare input (ex. `content.slice(0, 12000)`), clamp pe parametri;
5. `try/catch` → 500 prietenos.

### 2.6 Rate limiting (reutilizabil)

`src/lib/rate-limit.ts`: bucket-uri în DB (Postgres) cu advisory lock per cheie, partajate serverless.
API: `consumeBucket(key, limit, windowMs)`, `clearBucket`, `bucketRemaining`, `clientIp(headers)`.
Bucket-uri existente: OTP, register, feedback, Siera (`checkRateLimit/consumeRateLimit`).
→ pentru Content Studio adăugăm bucket-uri noi: `ai-content:<userId>` (de ex. generări/oră) + buget token-max per job.

### 2.7 Persistență (Prisma 7 + PostgreSQL)

- `prisma.config.ts` cu datasource `DATABASE_URL`; clientul folosește **driver adapter** `@prisma/adapter-pg` (`src/lib/db.ts`) → PostgreSQL real (disponibile: FTS `tsvector`, pgvector dacă DB-ul îl suportă).
- Modele relevante în `prisma/schema.prisma`: `Subject`, `Chapter`, `Unit`, `Lesson`, `LessonStep`, `Concept`, `Quiz`, `Question`, `Checkpoint`, `UserConceptProgress`, attempts, `SiteSetting` (folosit de rate-limit), enums `UnitType`/`UnitStatusEnum`/`QuestionType`/`Role`.
- Migrări în `prisma/migrations`, seed `prisma/seed.ts` (cu date demo; nu creează useri cu parolă → flow-ul autentificat de test se face cu un cont admin existent).

### 2.8 UI reutilizabil

- Shell admin în `src/app/(admin)/` (`admin/layout.tsx`, `admin-sidebar.tsx` cu linkuri hardcodate);
- componente primitive `src/components/ui/` (Card, Button, Input, Select, Badge, Skeleton, toast);
- pentru editorul de conținut BlockNote: `LessonEditor` deja există — draft-urile AI pot fi redate/editabile în BlockNote ca formatele live;
- `useToast` + pattern de feedback din form-urile admin existente.

### 2.9 Rute admin existente (fără Content Studio)

```
/admin, /admin/materii(+noua, [id], [id]/harta), /admin/capitole/[id],
/admin/lectii/[id](+constructor), /admin/teste(+nou, [id]), /admin/teme(+nou, [id]),
/admin/subiecte(+nou, [id]), /admin/intrebari/[id], /admin/bac, /admin/ai (setări chei AI), /admin/utilizatori
```

## 3. Ce lipsește (goluri de acoperit)

1. **Model de „proiect de conținut"**: stări de workflow, proprietar, materie.
2. **Storage de fișiere**: urcăm documente (PDF/DOCX/TXT/MD) → **Vercel Blob** (`@vercel/blob`), url semnat pe `ContentSource.storageKey`.
3. **Extragere text**: PDF → `pdf-parse`, DOCX → `mammoth`, TXT/MD nativ. Scan-uri fără text-layer → status FAILED.
4. **Chunking + metadata** (page/section/priority) și **embedding**: model `ContentChunk` + vector (`Float[]` dacă Prisma-l suportă pentru Postgres, altfel `Json`) + FTS fallback.
5. **Retrieval**: căutare pe chunks (semantic + fallback FTS), refs `{sourceId, page, chunkId}` pe articolele generate.
6. **Draft-uri tipărite + versiuni + validare**: model staging pentru lecții/quiz-uri/checkpoint-uri cu snapshot JSON, scor de validare, aprobare/reject.
7. **Job/status layer**: `GenerationJob` (QUEUED/RUNNING/DONE/FAILED); execuție síncronă per item (V1), graniță curată pentru coadă ulterioară.
8. **UI admin nou**: proiecte → surse → curriculum map → conținut → validare/review → publish + **Admin Assistant** (streamText cu tools legate de proiect).

## 4. Decizii blocate (confirmate)

| Domeniu | Decizie |
|---|---|
| Storage | Vercel Blob |
| Retrieval | Embeddings + cosine pe candidate filtrate, fallback PostgreSQL FTS |
| Execuție | Síncron per item cu `GenerationJob` + polling; fără coadă în V1 |
| Assistant | Inclus în V1 (tools: caută surse/chunks, caută conținut live pt. dedupe, sugerează acțiuni) |
| Non-negotiable | `requireAdmin()` peste tot; chei server-side; zero modele paralele live; rate-limit per admin; max 2 retry; conținut generat = draft până la aprobare umană |

## 5. Modele de staging propuse (schiță — se finalizează în Phase 1)

- `ContentProject` (name, subjectId FK, bacYear, examType, description, status, timestamps, approvedById)
- `ContentSource` (projectId, originalName, storageKey, mime, size, priority `OFFICIAL/HIGH/NORMAL/REFERENCE`, processStatus, pageCount?, error?, uploadedById)
- `ContentChunk` (sourceId, page?, section?, text, embedding, createdAt)
- `CurriculumNode` (projectId, kind `CHAPTER/UNIT/CONCEPT`, parentId self, title, slug?, order, description?, evidence Json, mappedId?, manual Bool)
- `ContentItem` (projectId, curriculumNodeId?, type, status, title, draft Json, validation Json?, version Int, versions Json[], sourceRefs Json, target FK?, publishedAt)
- `ProjectActivity` (projectId, userId, action, detail?)
- `GenerationJob` (projectId?, userId, kind, status, params Json, result Json?, error?, timestamps)

## 6. Riscuri și mitigări

| Risc | Mitigare |
|---|---|
| PDF fără text-layer (scanuri) | Detectăm la extragere → status FAILED + mesaj; nu blochează celelalte surse |
| Calitate embeddings / grounding slab | Retrieval hibrid (embeddings + FTS), source refs vizibile în review; validator AI raportează source coverage |
| Cost AI necontrolat | rate-limit `ai-content:<userId>` + buget token per job + generare per-item |
| Overflow de complexitate | Livrare pe faze (P0–P9), fiecare fase verificată (tsc/lint/build + flow browser) |
| Publicare incompletă (relații lipsă) | Publish doar prin `$transaction` + duplicate detection pe subiecte/capitole existente; legăm nodurile `mappedId` la obiectele reale |
| Draft vechi publicat din greșeală | status workflow explicit; publish doar din APPROVED |

## 7. Documente care decurg

- `docs/AI-CONTENT-AUDIT.md` (acest document)
- `docs/AI-CONTENT-STUDIO.md` — livrabil final (arhitectura completă, secțiuni funcționale, testare)

## 8. Index referințe cod

- `src/lib/access.ts` — currentUser / requireUser / requireAdmin / isAdmin
- `src/lib/ai-keys.ts` — encryptApiKey / decryptApiKey / maskApiKey
- `src/lib/rate-limit.ts` — consumeBucket / clearBucket / bucketRemaining
- `src/lib/checkpoint.ts` — evaluateCheckpoint (întrebări din quiz-urile unit/chapter)
- `src/lib/lesson-steps.ts` — syncLessonSteps
- `src/lib/actions/admin.ts` — saveSubject / saveChapter / saveLesson / getOrCreateLessonQuiz / createQuickQuiz / saveQuiz
- `src/app/api/admin/generate-exercises/route.ts` — pattern generateObject + getModel + zod
- `src/app/api/admin/generate-theme/route.ts` — pattern streamText admin
- `src/app/api/siera/chat/route.ts` — chat contextual (bază pt. Admin Assistant)
- `src/components/admin/lesson-editor.tsx`, `section-form.tsx`, `section-constructor.tsx`, `course-map.tsx` — UI reutilizabil
- `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts` — persistență/adapter pg