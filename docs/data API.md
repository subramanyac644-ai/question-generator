# Data API — Question Generator

All endpoints require an authenticated session and are role-gated server-side (see NFR-2). Roles: `principal`, `hod`, `teacher`, `student`.

## 1. Source Content

### `POST /api/v1/sources`
Upload a source PDF for question generation.

- Role: `teacher`
- Request: `multipart/form-data` — `file` (PDF)
- Response `201`:
```json
{
  "sourceId": "string",
  "fileName": "string",
  "pageCount": number,
  "status": "processed"
}
```

## 2. Generation

### `POST /api/v1/question-sets`
Trigger generation for one or more types against a source.

- Role: `teacher`
- Request:
```json
{
  "sourceId": "string",
  "typeRequests": [
    { "questionType": "fillInBlanks", "count": 10 },
    { "questionType": "matchTheFollowing", "count": 10 },
    { "questionType": "multipleChoice", "count": 5 }
  ]
}
```
- Behavior: types with `count: 0` must be omitted by the client or are ignored server-side (FR-1.10). Each `typeRequest` is processed independently (FR-1.1).
- Response `202` (async) or `201` (sync, small sets):
```json
{
  "questionSetId": "string",
  "status": "generating"
}
```

### `GET /api/v1/question-sets/{questionSetId}`
Poll/fetch generation result and per-type outcomes.

- Role: `teacher`, `hod` (department-scoped), `principal` (aggregate only — see Section 6)
- Response `200`:
```json
{
  "questionSetId": "string",
  "status": "draft | pending_approval | approved | published",
  "typeOutcomes": [
    { "questionType": "fillInBlanks", "requestedCount": 10, "actualCount": 10, "status": "success" },
    { "questionType": "matchTheFollowing", "requestedCount": 10, "actualCount": 7, "status": "failed", "failureReason": "Insufficient source content" }
  ],
  "questions": [ /* combined, globally-unique ids — see schema.md */ ]
}
```

### `POST /api/v1/question-sets/{questionSetId}/types/{questionType}/regenerate`
Regenerate a single failed or unsatisfactory type without affecting others.

- Role: `teacher`
- Request: `{ "count": 10 }`
- Response `202`: `{ "status": "generating" }`

## 3. Review & Editing

### `PATCH /api/v1/question-sets/{questionSetId}/questions/{questionId}`
Edit an individual question (Teacher only).

- Role: `teacher`
- Request: partial schema fields per `schema.md` for that question's type
- Response `200`: updated question object

### `POST /api/v1/question-sets/{questionSetId}/submit-for-approval`
Teacher submits a set to their department HOD.

- Role: `teacher`
- Response `200`: `{ "status": "pending_approval" }`

## 4. Approval (HOD)

### `GET /api/v1/departments/{departmentId}/question-sets`
List question sets pending/approved within the HOD's department.

- Role: `hod`
- Response `200`: array of `{ questionSetId, teacherId, status, typeOutcomes summary }`

### `POST /api/v1/question-sets/{questionSetId}/approve`
Approve a pending-approval set for publishing.

- Role: `hod`
- Response `200`: `{ "status": "published" }`

### `POST /api/v1/question-sets/{questionSetId}/types/{questionType}/request-regeneration`
HOD requests a Teacher regenerate one type.

- Role: `hod`
- Request: `{ "reason": "string" }`
- Response `200`: `{ "status": "regeneration_requested" }`

## 5. Export

### `POST /api/v1/question-sets/{questionSetId}/export`
Validate and produce the downloadable JSON file.

- Role: `teacher` only (FR-2.7)
- Preconditions: at least one type has `status: success` (VR-1)
- Response `200` (success):
  - Headers: `Content-Disposition: attachment; filename="questions_<timestamp>.json"`
  - Body: JSON array per `schema.md` Section 1
- Response `422` (validation failed, VR-4):
```json
{
  "error": "Invalid question structure detected"
}
```

## 6. Analytics & Audit

### `GET /api/v1/analytics/institution`
Institution-wide aggregates: generation volume, approval rates, export activity.

- Role: `principal`
- Response `200`:
```json
{
  "totalGenerationRuns": number,
  "totalApprovedSets": number,
  "totalExports": number,
  "byDepartment": [
    { "departmentId": "string", "generationRuns": number, "approvalRate": number, "exports": number }
  ]
}
```

### `GET /api/v1/analytics/departments/{departmentId}`
Department-scoped aggregates.

- Role: `hod` (own department only), `principal` (any department)
- Response `200`: same shape as a single `byDepartment` entry above, plus per-teacher breakdown.

### `GET /api/v1/audit-log`
Append-only audit trail: who generated/exported what, when, with what per-type outcome.

- Role: `hod` (department-scoped), `principal` (institution-wide)
- Query params: `questionSetId?`, `userId?`, `from?`, `to?`
- Response `200`: array of `{ userId, role, action, timestamp, questionSetId, typeOutcome }`

## 7. Student-Facing

### `GET /api/v1/assessments/assigned`
List assessments assigned to the current student.

- Role: `student`
- Response `200`: array of `{ assessmentId, title, dueDate }` — never includes raw `questionSetId`, JSON, or answer keys.

### `GET /api/v1/assessments/{assessmentId}`
Rendered, answer-key-free view of an approved/published assessment.

- Role: `student`
- Response `200`: questions with prompts/options only — `correctAnswer` and `explanation` fields are stripped server-side before serialization.

## 8. Error Conventions

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Authenticated but role not permitted for this action |
| `404` | Resource not found / not visible to this role-scope |
| `422` | Domain validation failure (e.g., schema invalid, export blocked) |
| `409` | Conflict (e.g., approving an already-published set) |

## 9. Versioning

All routes are prefixed `/api/v1/`. Backward-compatible field additions are non-breaking; any schema-breaking change requires `/api/v2/` and a `schemaVersion` tag on persisted `QuestionSet` records (NFR-6).