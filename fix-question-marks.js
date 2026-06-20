/**
 * Fix Question Marks Migration Script
 * 
 * This script updates all questions in the database to ensure they have marks in their content object.
 * Run this after deploying the app.controller.ts fix to populate existing questions with marks.
 * 
 * Usage:
 *   node fix-question-marks.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixQuestionMarks() {
  try {
    console.log('🔍 Fetching all questions from database...');
    
    const allQuestions = await prisma.question.findMany();

    console.log(`📊 Found ${allQuestions.length} total questions\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const question of allQuestions) {
      try {
        const content = question.content || {};
        
        // Check if content already has marks
        if (content.marks !== undefined && content.marks !== null && content.marks > 0) {
          skipped++;
          continue;
        }

        // Default to 1 mark
        const marksToAssign = 1;

        // Update question with marks in content
        const updatedContent = {
          ...content,
          marks: marksToAssign,
        };

        await prisma.question.update({
          where: { id: question.id },
          data: { content: updatedContent },
        });

        console.log(`  ✅ Updated question ${question.id}: marks = ${marksToAssign}`);
        updated++;
      } catch (err) {
        errors++;
        console.error(`❌ Error updating question ${question.id}:`, err.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Already correct: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total processed: ${allQuestions.length}`);

    if (updated > 0) {
      console.log('\n✨ Successfully fixed question marks!');
      console.log('📱 Students should now see correct marks when taking tests.');
    } else if (skipped > 0) {
      console.log('\n✨ All questions already have marks - no updates needed!');
    }

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixQuestionMarks();
