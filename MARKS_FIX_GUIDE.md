# Question Marks Display Fix

## Problem
Students see `[0 Marks]` for all questions instead of the correct allocated marks like `[1 Marks]`, `[2 Marks]`, etc.

## Root Cause
The marks field was not being preserved in the question's content object when saving to the database. Even though marks were generated with each question, they weren't being stored in the JSON content field that the student UI reads from.

## Solution Deployed

### 1. Backend Fix (app.controller.ts)
Updated the `saveQuestionSet()` method to explicitly extract and preserve the `marks` field in the question's content:

```typescript
const content: any = {
  marks: q.marks ?? contentSource.marks ?? 0,  // ← PRIORITY: q.marks first
  question: q.question || contentSource.question || {...},
  ...
};
```

**Flow:**
1. Teacher sets `marksPerQuestion` (e.g., 2 marks)
2. Backend generates questions with marks included
3. `saveQuestionSet()` now extracts marks → stores in `content.marks`
4. Student UI reads `content.marks` → displays correctly

### 2. Student UI (Already Correct)
The student page already correctly reads and displays marks:
```typescript
const content = JSON.parse(item.question.content);
[{content.marks || 0} Marks]  // ✅ This works once content.marks exists
```

## How to Apply the Fix

### For New Questions (Automatic)
Simply regenerate questions and export them. The backend fix ensures marks are preserved automatically.

### For Existing Questions (Migration)
Run the provided migration script to update existing questions:

```bash
# Navigate to project root
cd /path/to/Question\ paper

# Run the migration script
node fix-question-marks.js
```

**What the script does:**
- Scans all questions in the database
- Checks if `content.marks` exists and is valid
- For questions missing marks:
  - Looks for marks in the QuestionSetQuestion relationship
  - Defaults to 1 mark if not found
- Updates each question's content with the marks field
- Logs a detailed summary of changes

**Expected output:**
```
🔍 Fetching all questions and their relationships...
📊 Found 39 total questions

  → Question abc123: Adding marks = 1
  → Question def456: Adding marks = 2
  ...

🔄 Applying 39 updates in batch...

📈 Migration Summary:
  ✅ Updated: 39
  ⏭️  Already correct: 0
  ❌ Errors: 0
  📊 Total processed: 39

✨ Successfully fixed question marks!
📱 Students should now see correct marks when taking tests.
```

## Verification

### After Migration
1. ✅ Run migration script: `node fix-question-marks.js`
2. ✅ Refresh student quiz page (hard refresh if needed)
3. ✅ Verify questions now show actual marks instead of `[0 Marks]`

### For New Questions
1. ✅ Generate new questions with specific `marksPerQuestion` (e.g., 2 marks)
2. ✅ Export to create the assessment
3. ✅ Verify marks display correctly in student view

## Technical Details

### Mark Assignment Strategy
- **Generated Questions:** Marks set by `marksPerQuestion` parameter → OpenRouter includes in response → `saveQuestionSet()` extracts and stores
- **Mock Fallback:** Mock generator includes marks field to maintain consistency
- **Existing Questions:** Migration script assigns 1 mark per question (or uses relationship value if available)

### Files Modified
- `apps/api/src/app/app.controller.ts` - saveQuestionSet() method (lines 500-530)
- New: `fix-question-marks.js` - Migration script at project root

### Data Structure After Fix
```javascript
// Before Fix
{
  id: "q-123",
  content: {
    question: { text: "..." },
    correctAnswer: "...",
    options: [...]
    // ❌ marks field was missing
  }
}

// After Fix
{
  id: "q-123",
  content: {
    marks: 2,  // ✅ Now included
    question: { text: "..." },
    correctAnswer: "...",
    options: [...]
  }
}
```

## Next Steps

1. **Immediate:** Run `node fix-question-marks.js` to fix existing questions
2. **Test:** Refresh student quiz page and verify marks display
3. **Future:** All newly generated questions will automatically have marks preserved

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script fails to connect to database | Ensure `.env` is configured correctly and database is running |
| Still seeing `[0 Marks]` after migration | Clear browser cache or do a hard refresh (Ctrl+Shift+R) |
| Marks show incorrect values | Regenerate questions with correct `marksPerQuestion` setting |
| Some questions unchanged | Check script output - if "Errors" > 0, investigate error messages |

---

**Deployed with**: Backend fix + Migration script  
**Status**: ✅ Ready to apply
