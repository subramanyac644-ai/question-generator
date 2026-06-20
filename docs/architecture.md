# Architecture — Question Generator

## 1. High-Level Component Diagram

```
                         ┌─────────────────────────┐
                         │        Client Apps       │
                         │  (Teacher / HOD /        │
                         │   Principal / Student UI)│
                         └────────────┬─────────────┘
                                      │ HTTPS (role-scoped JWT/session)
                                      ▼
                         ┌─────────────────────────┐
                         │        API Gateway        │
                         │  - AuthN/AuthZ middleware │
                         │  - Role-based route guard │
                         └────────────┬─────────────┘
                                      │
        ┌─────────────────┬──────────┴──────────┬─────────────────┐
        ▼                 ▼                     ▼                 ▼
┌───────────────┐ ┌───────────────┐   ┌──────────────────┐ ┌───────────────┐
│ Generation     │ │ Review &      │   │ Export Service    │ │ Analytics /    │
│ Orchestrator   │ │ Approval      │   │ - schema validate  │ │ Audit Service  │
│ Service        │ │ Service       │   │ - JSON serialize   │ │ (Principal/HOD)│
└──────┬─────────┘ └──────┬────────┘   └──────────┬────────┘ └───────┬───────┘
       │                  │                       │                   │
       ▼                  ▼                       ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           Shared Data Layer                                │
│  QuestionSets │ TypeRequests │ Questions │ GenerationRuns │ ExportEvents   │
│  Users/Roles  │ Departments  │ Approvals │ AuditLog                        │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────┐       ┌──────────────────────┐
│ Per-Type Generator  │──────▶│ Source Content Store  │
│ Workers (one per    │       │ (uploaded PDFs,       │
│ question type,       │       │  parsed text/chunks)  │
│ run independently)   │       └──────────────────────┘
└───────────────────┘
       │
       ▼
┌───────────────────┐
│ LLM / Extraction    │
│ Provider             │
└───────────────────┘
```

## 2. Generation Orchestrator (Feature 1)

Responsible for enforcing per-type isolation and exact counts.

```
Orchestrator.generate(questionSetId, typeRequests[])
  for each typeRequest in typeRequests (parallel, independent):
      if typeRequest.count == 0:
          mark typeRequest.status = "skipped"
          continue
      worker = GeneratorWorker(typeRequest.questionType)
      result = worker.run(sourceContent, typeRequest.count)
      if result.count > typeRequest.count:
          result = trim(result, typeRequest.count)
      elif result.count < typeRequest.count:
          result = retry(worker, shortfall)
          if still short:
              mark typeRequest.status = "failed"
              record failureReason
              continue
      validate(result, schema[typeRequest.questionType])
      assign globally-unique ids (cross-type counter)
      mark typeRequest.status = "success"
      append result.questions to questionSet.questions
  combine all successful typeRequests' questions into questionSet
  deduplicate across the full combined set
  persist questionSet + per-type outcomes (for audit)
  return questionSet with mixed success/failed statuses
```

Key architectural property: **type-level isolation**. One type's worker failing must never throw/abort sibling workers (NFR-4). This is implemented as independent async tasks with individually caught/recorded outcomes, not a single try/catch around the whole batch.

## 3. Export Service (Feature 2)

```
ExportService.export(questionSetId, requestingUserId)
  assert requestingUserId.role == "Teacher"      // FR-2.7 / NFR-2
  questionSet = load(questionSetId)
  successfulTypes = questionSet.typeRequests.filter(status == "success")
  assert successfulTypes.length > 0               // VR-1
  exportPayload = []
  for each type in successfulTypes:
      block = { questionType, totalMarks: sum(marks), questions }
      validateSchema(block)                        // VR-2
      assert block.totalMarks == sum(block.questions.marks)  // VR-3
      exportPayload.push(block)
  if any validation failed:
      return Error("Invalid question structure detected")  // VR-4
  fileName = `questions_${timestamp()}.json`
  recordExportEvent(questionSetId, requestingUserId, fileName)  // NFR-3
  return downloadable(exportPayload, fileName)
```

## 4. Role Enforcement Layer

All role checks are duplicated at the API layer (never UI-only), per NFR-2.

```
Middleware: requireRole(allowedRoles[])
  - Teacher-only: configure source, trigger generation, edit/regenerate, export
  - HOD: view department sets, approve, request regeneration
  - Principal: read-only aggregate analytics endpoints only
  - Student: view-published-assessment endpoint only (no raw question/JSON endpoints reachable)
```

## 5. Data Flow Summary

1. Teacher uploads PDF → Source Content Store parses/chunks it.
2. Teacher submits type/count selections → Generation Orchestrator.
3. Orchestrator fan-outs to per-type Generator Workers (LLM-backed).
4. Results validated, trimmed/retried, combined, globally-uniqued → persisted as QuestionSet.
5. Teacher reviews/edits → optionally submits for HOD approval.
6. HOD approves → QuestionSet status becomes `published`, visible to Students via the read-only rendering endpoint.
7. Teacher (independently, any time after success) triggers Export Service → validated JSON file.
8. All generation runs and export events are written to the Audit Service, surfaced to HOD (department-scoped) and Principal (institution-wide).

## 6. Failure Isolation & Auditability

- Per-type failures are recorded as structured outcomes on `GenerationRun.perTypeOutcomes`, not thrown exceptions that abort the batch.
- `AuditLog` entries are immutable, append-only, and keyed by `(userId, role, action, timestamp, questionSetId, typeOutcome)`.
- Export validation failures never produce a partial file — the export path is all-or-nothing.

## 7. Non-Functional Mapping

| NFR | Architectural mechanism |
|---|---|
| Determinism | Per-type explicit count contract; no shared default path exists in the orchestrator. |
| Authorization | Gateway-level `requireRole` middleware on every route, re-checked at service layer. |
| Auditability | `GenerationRun` + `ExportEvent` immutable audit tables, surfaced via Analytics/Audit Service. |
| Performance/Isolation | Independent async workers per type; no shared failure path. |
| Data integrity | Export Service schema validation gate before any file is produced. |
| Backward compatibility | Legacy QuestionSets retain a `schemaVersion` flag; rendering path branches on it, not retrofitted. |