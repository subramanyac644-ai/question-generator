# Schema — Question Generator

All schemas below are normative. No extra/undocumented fields are allowed. `explanation` is mandatory on every question, for every type. The `question` object always contains exactly: `hide_text`, `text`, `read_text`, `image`.

## 1. Export Top-Level Structure

The exported file is a single JSON array. Each element represents one question type that was actually generated (count > 0 and succeeded).

```json
[
  {
    "questionType": "string",
    "totalMarks": number,
    "questions": []
  }
]
```

Invariant: `totalMarks` = sum of `marks` across all `questions` in that block.

## 2. Common `question` Object

Embedded in every question type under the `question` key:

```json
{
  "hide_text": boolean,
  "text": string,
  "read_text": boolean,
  "image": string
}
```

## 3. Per-Type Schemas

### 3.1 fillInBlanks

```json
{
  "questionType": "fillInBlanks",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": {
        "hide_text": boolean,
        "text": string,
        "read_text": boolean,
        "image": string
      },
      "correctAnswer": string,
      "alternatives": [string],
      "explanation": string
    }
  ]
}
```

### 3.2 multipleChoice

```json
{
  "questionType": "multipleChoice",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "options": [
        {
          "hide_text": boolean,
          "text": string,
          "read_text": boolean,
          "image": string
        }
      ],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}
```

### 3.3 multiSelect

```json
{
  "questionType": "multiSelect",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "options": [
        { "hide_text": boolean, "text": string, "read_text": boolean, "image": string }
      ],
      "correctAnswer": [string],
      "explanation": string
    }
  ]
}
```

### 3.4 matchTheFollowing

```json
{
  "questionType": "matchTheFollowing",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "leftItems": [string],
      "rightItems": [string],
      "correctAnswer": [
        { "left": string, "right": string }
      ],
      "explanation": string
    }
  ]
}
```

### 3.5 reordering

```json
{
  "questionType": "reordering",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "items": [string],
      "correctAnswer": [string],
      "explanation": string
    }
  ]
}
```

### 3.6 sorting

```json
{
  "questionType": "sorting",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "categories": [string],
      "items": [string],
      "correctAnswer": {
        "categoryName": [string]
      },
      "explanation": string
    }
  ]
}
```

### 3.7 trueFalse

```json
{
  "questionType": "trueFalse",
  "totalMarks": number,
  "questions": [
    {
      "id": number,
      "marks": number,
      "question": { "hide_text": boolean, "text": string, "read_text": boolean, "image": string },
      "correctAnswer": boolean,
      "explanation": string
    }
  ]
}
```

## 4. Field Reference

| Field | Type | Notes |
|---|---|---|
| `questionType` | string (enum) | One of the 7 supported types |
| `totalMarks` | number | Must equal sum of `marks` in `questions` |
| `id` | number | Globally unique across the entire exported dataset |
| `marks` | number | Per-question marks, numeric |
| `question.hide_text` | boolean | Whether prompt text is hidden in UI |
| `question.text` | string | Prompt text |
| `question.read_text` | boolean | Whether text-to-speech is enabled |
| `question.image` | string | Image URL/reference, empty string if none |
| `correctAnswer` | varies | string / [string] / boolean / [{left,right}] / {categoryName:[string]} depending on type |
| `explanation` | string | Mandatory rationale for the correct answer |
| `alternatives` | [string] | fillInBlanks only — accepted alternate answers |
| `options` | [object] | multipleChoice / multiSelect only |
| `leftItems` / `rightItems` | [string] | matchTheFollowing only |
| `items` | [string] | reordering / sorting |
| `categories` | [string] | sorting only |

## 5. Internal Domain Model (pre-export, for reference)

Conceptual entities used by the generation/review pipeline before export-time shaping into the schema above:

```
QuestionSet
 ├─ id
 ├─ sourceDocumentId
 ├─ createdByTeacherId
 ├─ departmentId
 ├─ status: draft | pending_approval | approved | published
 ├─ typeRequests[]            // one per requested type
 │    ├─ questionType
 │    ├─ requestedCount
 │    ├─ status: success | failed | skipped (count=0)
 │    └─ failureReason?
 └─ questions[]                // flattened, globally unique ids
      └─ (shape per Section 3, plus internal-only audit fields)

GenerationRun
 ├─ id
 ├─ questionSetId
 ├─ triggeredByUserId (Teacher)
 ├─ timestamp
 └─ perTypeOutcomes[]           // role: NFR-3 auditability

ExportEvent
 ├─ id
 ├─ questionSetId
 ├─ exportedByUserId (Teacher)
 ├─ timestamp
 ├─ fileName                    // questions_<timestamp>.json
 └─ validationResult: passed | blocked
```