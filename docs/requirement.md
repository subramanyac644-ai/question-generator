# Requirements — Question Generator

Source: PRD_Question_Generator_v2 (Internal Engineering, Version 2.0)

## 1. Context

The Question Generator converts source material (typically a PDF) into structured, schema-compliant assessment questions across seven supported types, and allows generated sets to be exported as JSON. This revision fixes two production-blocking defects and adds role-aware access across four roles: Principal, HOD, Teacher, Student.

## 2. Functional Requirements

### 2.1 Per-Type Question Count (Feature 1)

- FR-1.1: Each question type is processed independently of every other type. There is no shared/global count or budget.
- FR-1.2: Generation strictly follows the Teacher-supplied count for each type.
- FR-1.3: No default or fallback count may exist anywhere in the system.
- FR-1.4: When multiple types are selected, each is generated separately, then combined into one result set.
- FR-1.5: Total questions returned must equal the sum of all selected per-type counts.
- FR-1.6: If generation returns more than requested for a type, the excess is trimmed.
- FR-1.7: If generation returns fewer than requested, the system retries; if retries are exhausted, it fails with an explicit per-type error.
- FR-1.8: Every question must strictly conform to its type's schema.
- FR-1.9: Every question `id` is unique across the entire combined dataset (not just within its type).
- FR-1.10: If count = 0 for a type, that type is skipped entirely — not generated, not requested, not present in output.
- FR-1.11: If the source PDF has insufficient content to satisfy a type's requested count, the system returns a failure scoped to that type only, without blocking types that succeeded.
- FR-1.12: The system actively prevents duplicate questions, both within a type and across types.

### 2.2 Export Questions — JSON Download (Feature 2)

- FR-2.1: Teacher can export a generated set as a single `.json` file.
- FR-2.2: The "Export Questions" action is visible only once generation has succeeded for at least one type.
- FR-2.3: Export includes all generated questions from all generated types.
- FR-2.4: Only types that were actually generated (count > 0 and succeeded) appear in the export; excluded/failed types are absent — never present as empty arrays.
- FR-2.5: File name format: `questions_<timestamp>.json`.
- FR-2.6: Export is a direct, automatic file download — no manual copy/paste step.
- FR-2.7: Export action is restricted to the Teacher role at the API layer.

### 2.3 Role-Based Access (Feature 3)

- FR-3.1: Four roles exist: Principal, HOD, Teacher, Student.
- FR-3.2: Only Teacher can configure source content, select types/counts, trigger generation, edit/regenerate, and export.
- FR-3.3: HOD can view sets generated within their department, approve for publishing, or request regeneration of a specific type. HOD cannot generate from scratch or export raw files.
- FR-3.4: Principal has read-only, institution-wide aggregate views (generation activity, quality metrics, export logs). Principal cannot view raw question content or trigger export.
- FR-3.5: Student can only view a rendered, approved assessment when assigned. Student has no access to generation, export, raw JSON, or answer keys prior to release.
- FR-3.6: HOD approval is required before a Teacher-generated set is published to Students, unless an institution-level setting permits Teacher self-publish.
- FR-3.7: All role checks are enforced server-side; client-side UI hiding is not sufficient on its own.

## 3. Validation Requirements

- VR-1: Before allowing download, at least one question must exist in the export set.
- VR-2: Every question in every type must pass schema validation exactly.
- VR-3: `totalMarks` for each type block must equal the sum of `marks` across that type's questions.
- VR-4: If any validation fails, export is blocked entirely (no partial/best-effort file), and the system shows: **"Invalid question structure detected."**

## 4. Common Schema Rules (apply to all 7 types)

- `id` is globally unique across the full exported dataset.
- `marks` is numeric on every question.
- `question` object always contains exactly: `hide_text`, `text`, `read_text`, `image`.
- `explanation` is mandatory on every question, every type.
- No extra/undocumented fields are allowed beyond the type's defined schema.

## 5. Non-Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-1 | Determinism | Identical inputs must not silently produce a different total count between runs; deviations surface as explicit per-type errors, never silent substitution. |
| NFR-2 | Authorization | Generation and export endpoints enforce role checks server-side. |
| NFR-3 | Auditability | Every generation run and export action is logged with role, timestamp, and per-type outcome. |
| NFR-4 | Performance/Isolation | A failure in one type's generation must not block or delay types that succeeded. |
| NFR-5 | Data integrity | Exported files are valid, parseable JSON with no trailing/malformed content. |
| NFR-6 | Backward compatibility | Pre-existing sets generated under old default-count behavior remain viewable (without retroactive enforcement). |

## 6. Out of Scope (Non-Goals)

- Question bank marketplace or cross-institution sharing.
- Question types beyond the seven defined (fillInBlanks, multipleChoice, multiSelect, matchTheFollowing, reordering, sorting, trueFalse).
- Real-time collaborative editing of a question set by multiple simultaneous users.

## 7. Success Criteria

- 100% of generation requests return the exact requested count per type, or an explicit per-type failure.
- 100% of successful exports open without errors and pass schema validation on first attempt.
- Zero instances of Student access to generation, export, or pre-approval content in audit logs.
- Support tickets for "wrong number of questions generated" trend to zero post-launch.