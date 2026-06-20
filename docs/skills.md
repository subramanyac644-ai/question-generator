# Skills — Question Generator

Engineering competencies and operational skills required to build, validate, and run this system, mapped to the PRD's features and non-functional requirements.

## 1. Backend / Generation Pipeline

- Designing independent, isolated async workers per question type so one type's failure never blocks or delays others (NFR-4).
- Implementing retry-with-backoff and trim-on-excess logic against a non-deterministic generation source (LLM-backed) while still guaranteeing an exact final count (FR-1.5–1.7).
- Global uniqueness enforcement for `id` across a combined, multi-type dataset (FR-1.9) — typically a cross-type counter or UUID strategy, not per-type auto-increment.
- Duplicate-detection logic across both within-type and cross-type question sets (FR-1.12).
- PDF parsing / content chunking sufficient to detect "insufficient content for requested count" per type before exhausting retries (FR-1.11).

## 2. Schema Validation & Data Integrity

- JSON Schema (or equivalent) authoring and enforcement for seven distinct, related-but-different question shapes (see `schema.md`).
- Building an all-or-nothing validation gate: no partial/best-effort export ever leaves the system if any block fails validation (VR-1–VR-4).
- Numeric invariant checks (`totalMarks` == sum of `marks`) as a hard pre-export gate, not a warning.
- Strict "no extra fields" enforcement (schema rejects undocumented keys) without false-positives on legitimate optional structures like `alternatives`.

## 3. Authorization & Security

- Server-side role-based access control (RBAC) that cannot be bypassed by client-side manipulation (NFR-2) — every mutating and read endpoint re-checks role, not just the UI layer.
- Designing answer-key stripping at serialization time for Student-facing endpoints (correctAnswer/explanation never transmitted pre-submission).
- Department-scoping logic for HOD (own department only) vs. institution-scoping for Principal, implemented as query-level filters, not post-fetch filtering.

## 4. API Design

- REST endpoint design with clear separation between generation, review/approval, export, and analytics concerns (see `data API.md`).
- Async job patterns (`202 Accepted` + polling, or webhook/event) for potentially long-running multi-type generation requests.
- Consistent error-contract design (`401/403/404/409/422`) so clients can distinguish "not allowed" from "invalid domain state" from "validation failure."

## 5. Auditability & Observability

- Append-only audit log design (`GenerationRun`, `ExportEvent`) capturing user, role, timestamp, and per-type outcome for every action (NFR-3).
- Building aggregate analytics (generation volume, approval rate, export activity) without exposing underlying raw question content to Principal-level views (FR-3.4).
- Metric instrumentation for HOD median time-to-approve, as a baseline for future workflow optimization.

## 6. Frontend / UX

- Conditional UI state: "Export Questions" button only appears once ≥1 type has succeeded (FR-2.2) — and is hidden entirely for non-Teacher roles, in addition to backend gating.
- Per-type success/failure rendering inline in the review screen, distinguishing "skipped (count=0)" from "failed (insufficient content)" from "succeeded" states.
- Building distinct dashboard views for three oversight personas (Teacher review screen, HOD department dashboard, Principal institution dashboard) from a shared underlying data model.
- Rendering a Student-facing assessment view that is structurally incapable of leaking answer keys (not just hidden via CSS/JS).

## 7. Testing & QA

- Contract testing for each of the seven question-type schemas independently.
- Adversarial testing of role boundaries: attempting Teacher-only actions as HOD/Principal/Student and asserting `403`.
- Property-based testing of "requested count in, exact count out" across many type/count combinations, including edge cases (`count = 0`, `count` exceeding source content capacity).
- Regression testing to confirm legacy (pre-fix) question sets remain viewable under `schemaVersion` tagging (NFR-6) without being force-migrated.

## 8. Process / Domain Knowledge

- Understanding academic assessment workflows (lesson planning, grading weightage, time-boxed assessments) well enough to translate "exact count" from a UX nicety into a hard product requirement.
- Familiarity with institutional hierarchy (Principal → HOD → Teacher → Student) to correctly model approval chains and self-publish exceptions (FR-3.6).