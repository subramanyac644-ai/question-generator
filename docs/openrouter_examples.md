# OpenRouter Integration - Example Requests & Responses

This document provides examples of requests sent to the OpenRouter completions API and the structured JSON responses returned by the models for the 7 standard question formats.

---

## 1. General Request Structure

### Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <OPENROUTER_API_KEY>
HTTP-Referer: http://localhost:3000
X-Title: Question Generator Platform
```

### Base Request Body
```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert curriculum designer and educator. You generate highly accurate educational questions. You must return your response in pure JSON format matching the schema requested. Do not wrap the JSON in markdown code blocks."
    },
    {
      "role": "user",
      "content": "<PROMPT_WITH_SCHEMA_DETAILS>"
    }
  ],
  "response_format": { "type": "json_object" }
}
```

---

## 2. Question Format Examples

### 1. Fill in the Blanks (`fillInBlanks`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Detailed question text with a blank represented by six underscores (______)",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation for correct answer",
  "correctAnswer": "correct word",
  "alternatives": ["alternative correct word 1", "alternative correct word 2"]
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "In Javascript, variables declared with the ______ keyword are block-scoped.",
      "read_text": true,
      "image": ""
    },
    "explanation": "Variables declared with 'let' and 'const' are block-scoped, unlike 'var' which is function-scoped.",
    "correctAnswer": "let",
    "alternatives": ["const"]
  }
]
```

---

### 2. Multiple Choice (`multipleChoice`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Detailed question text",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation/rationale",
  "options": [
    { "hide_text": false, "text": "Option A text", "read_text": true, "image": "" },
    { "hide_text": false, "text": "Option B text", "read_text": true, "image": "" }
  ],
  "correctAnswer": "Option A text"
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "Which HTTP method is typically used to retrieve data from a server?",
      "read_text": true,
      "image": ""
    },
    "explanation": "The GET method is designed to retrieve data without side effects.",
    "options": [
      { "hide_text": false, "text": "POST", "read_text": true, "image": "" },
      { "hide_text": false, "text": "GET", "read_text": true, "image": "" },
      { "hide_text": false, "text": "DELETE", "read_text": true, "image": "" }
    ],
    "correctAnswer": "GET"
  }
]
```

---

### 3. Multi-Select (`multiSelect`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Detailed question text",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation/rationale",
  "options": [
    { "hide_text": false, "text": "Option A text", "read_text": true, "image": "" },
    { "hide_text": false, "text": "Option B text", "read_text": true, "image": "" }
  ],
  "correctAnswer": ["Option A text", "Option B text"]
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "Which of the following are primitive data types in JavaScript? (Select all that apply)",
      "read_text": true,
      "image": ""
    },
    "explanation": "String, Number, and Boolean are primitive types. Array and Object are reference types.",
    "options": [
      { "hide_text": false, "text": "String", "read_text": true, "image": "" },
      { "hide_text": false, "text": "Array", "read_text": true, "image": "" },
      { "hide_text": false, "text": "Boolean", "read_text": true, "image": "" },
      { "hide_text": false, "text": "Number", "read_text": true, "image": "" }
    ],
    "correctAnswer": ["String", "Boolean", "Number"]
  }
]
```

---

### 4. Match the Following (`matchTheFollowing`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Detailed instruction",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation",
  "leftItems": ["Left item 1", "Left item 2"],
  "rightItems": ["Right item A", "Right item B"],
  "correctAnswer": [
    { "left": "Left item 1", "right": "Right item A" },
    { "left": "Left item 2", "right": "Right item B" }
  ]
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "Match the SQL commands to their respective categories.",
      "read_text": true,
      "image": ""
    },
    "explanation": "SELECT is DQL, INSERT is DML, and CREATE is DDL.",
    "leftItems": ["SELECT", "CREATE", "INSERT"],
    "rightItems": ["DDL (Definition)", "DML (Manipulation)", "DQL (Query)"],
    "correctAnswer": [
      { "left": "SELECT", "right": "DQL (Query)" },
      { "left": "CREATE", "right": "DDL (Definition)" },
      { "left": "INSERT", "right": "DML (Manipulation)" }
    ]
  }
]
```

---

### 5. Reordering (`reordering`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Instruction to reorder",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation",
  "items": ["Random item 1", "Random item 2"],
  "correctAnswer": ["Correct ordered 1", "Correct ordered 2"]
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "Arrange the steps of standard Git deployment in the correct order.",
      "read_text": true,
      "image": ""
    },
    "explanation": "You must stage changes (add), write a commit message (commit), and then send it to remote repository (push).",
    "items": ["git commit", "git push", "git add"],
    "correctAnswer": ["git add", "git commit", "git push"]
  }
]
```

---

### 6. Sorting (`sorting`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Instruction to sort",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation",
  "categories": ["Category A", "Category B"],
  "items": ["Item X", "Item Y"],
  "correctAnswer": {
    "Category A": ["Item X"],
    "Category B": ["Item Y"]
  }
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "Sort the technologies into Frontend or Backend categories.",
      "read_text": true,
      "image": ""
    },
    "explanation": "React and HTML run in the client browser (Frontend), while Node.js and Express run on the server (Backend).",
    "categories": ["Frontend", "Backend"],
    "items": ["Node.js", "React", "Express", "HTML"],
    "correctAnswer": {
      "Frontend": ["React", "HTML"],
      "Backend": ["Node.js", "Express"]
    }
  }
]
```

---

### 7. True/False (`trueFalse`)

#### Prompt Schema Snippet
```json
{
  "id": 1,
  "marks": 5,
  "question": {
    "hide_text": false,
    "text": "Statement statement statement",
    "read_text": true,
    "image": ""
  },
  "explanation": "Explanation",
  "correctAnswer": true
}
```

#### Example JSON Response
```json
[
  {
    "id": 1,
    "marks": 5,
    "question": {
      "hide_text": false,
      "text": "HTTP is a stateful protocol by default.",
      "read_text": true,
      "image": ""
    },
    "explanation": "HTTP is stateless by default; cookies/sessions are used to manage state.",
    "correctAnswer": false
  }
]
```
