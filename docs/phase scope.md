# Phase Scope — Question Generator

Derived from PRD v2.0 (Internal Engineering). Scope is sequenced to land the two production-blocking fixes first, then role-based access, then oversight tooling.

## Phase 1 — Per-Type Question Count Fix (Feature 1)

**Goal:** eliminate the fixed/default ~20-question fallback; enforce exact per-type counts.

In scope:
- Independent generation pipeline per question type (FR-1.1–1.4)
- Trim-on-excess, retry-on-shortfall, explicit per-type failure (FR-1.5–1.7)
- Schema conformance + globally unique `id` enforcement (FR-1.8–1.9)
- Count = 0 skip behavior (FR-1.10)
- Per-type insufficient-content failure messaging (FR-1.11)
- Cross-type and within-type duplicate prevention (FR-1.12)

Out of scope for Phase 1: export, role gating, HOD/Principal views.

Exit criteria: 100% of test generations return exact requested counts per type or an explicit per-type error; zero default-count fallbacks observed.

## Phase 2 — Export Questions / JSON Download (Feature 2)

**Goal:** ship a strict, validated JSON export path.

In scope:
- Export endpoint + schema validation gate (VR-1–VR-4)
- File naming (`questions_<timestamp>.json`) and direct-download behavior (FR-2.1–FR-2.6)
- "Invalid question structure detected" error path
- Export restricted to Teacher role at the API layer (FR-2.7)

Out of scope for Phase 2: HOD/Principal export visibility (history view only, not raw export), analytics dashboards.

Exit criteria: 100% of successful exports pass schema validation and open without errors on first attempt.

## Phase 3 — Role-Based Access (Feature 3)

**Goal:** introduce Principal, HOD, Teacher, Student as first-class roles with server-side enforcement.

In scope:
- Role model + server-side `requireRole` middleware (FR-3.1, NFR-2)
- Teacher-exclusive generation/export/edit actions (FR-3.2)
- HOD review/approve/request-regeneration workflow (FR-3.3, 3.6)
- Principal read-only aggregate views (FR-3.4)
- Student view-only, answer-key-stripped assessment access (FR-3.5)
- Audit logging for every generation run and export event (NFR-3)

Out of scope for Phase 3: cross-department analytics drill-down detail beyond aggregate counts; real-time collaborative review.

Exit criteria: zero instances of a non-Teacher role successfully calling a generation/export endpoint in security testing; zero Student access to raw JSON or pre-approval content in audit logs.

## Phase 4 — Oversight & Analytics Hardening

**Goal:** round out HOD/Principal tooling and backward-compatibility guarantees.

In scope:
- Department dashboard (HOD) and institution dashboard (Principal) UI (Section 7.2–7.3 UX flows)
- Audit log query API (`GET /api/v1/audit-log`)
- Legacy `schemaVersion` tagging for pre-fix question sets (NFR-6)
- HOD median time-to-approve metric instrumentation

Out of scope: question bank marketplace, cross-institution sharing, new question types beyond the seven defined, real-time multi-user collaborative editing (explicit Non-Goals).

Exit criteria: all Success Metrics in `requirement.md` Section 7 are measurable via dashboards/audit log; legacy sets remain viewable without retroactive count enforcement.

## Phase Sequencing Rationale

Phases 1 and 2 directly resolve the two stated production-blocking defects and can ship independently of the role system (initially gated behind a single "Teacher" assumption if roles aren't yet live). Phase 3 then layers access control on top without re-touching the generation/export logic. Phase 4 is purely additive oversight tooling and carries no risk to the core generation/export contracts.