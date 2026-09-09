# Băculeț Domain Context

## Product

Băculeț is a Romanian BAC preparation platform. The core product goal is not simply to display school material; it should guide a student through a structured path from learning to demonstrated understanding.

## Canonical learning hierarchy

Subject
→ Chapter
→ Unit
→ Lesson
→ LessonStep

A Lesson contains instructional content. A LessonStep is a smaller instructional segment and may contain an associated quiz.

A Unit can group lessons and may have a checkpoint and user progress.

## Assessment concepts

### Practice / Quiz
Used to exercise or check a concept or lesson. A quiz has questions and attempts.

### Checkpoint
A checkpoint is a meaningful assessment gate in the learning path. It measures whether the student is ready to advance after a unit/chapter segment. It has attempts and a score; it should not replace the lesson experience.

### Diagnostic
Used to establish an initial understanding/profile and should not be treated as ordinary lesson completion.

## Mastery

Concept-level mastery is the longer-term learning signal. Current code represents it through `UserConceptProgress`, with mastery, attempts, correctness counts, and review timing.

Mastery is not the same thing as lesson completion.

## Progress vocabulary

- Lesson progress: whether the student completed a lesson.
- Lesson step progress: whether an instructional step was completed.
- Unit progress: path-level state such as locked/in-progress/completed.
- Concept mastery: how well the student knows a concept over time.
- Checkpoint attempt: an assessment event with score/answers.

Never collapse these into one generic `progress` concept.

## AI / Sierra

Siera is the product's AI-facing experience. AI features should be contextual, safe, rate-limited, validated, and connected to the student's current learning state when relevant.

## Content model

Lesson content may be stored as rich text and can also contain media references. The project uses BlockNote and math rendering. Reuse the existing content pipeline rather than inventing a new lesson format.

## Domain decision rule

When a feature request is ambiguous, prefer the smallest change that preserves these distinctions:

content ≠ practice ≠ assessment ≠ progress ≠ mastery.
