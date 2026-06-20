const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacherEmail = 'teacher@qgp.edu';
  
  // 1. Delete all existing users with role TEACHER
  await prisma.user.deleteMany({
    where: { role: 'TEACHER' }
  });
  console.log('Deleted any existing teacher accounts.');

  // 2. Create the single official teacher account
  const newTeacher = await prisma.user.create({
    data: {
      email: teacherEmail,
      name: 'Official Teacher',
      passwordHash: 'supabase-auth-managed',
      role: 'TEACHER',
    }
  });

  console.log('Created the single official teacher account:');
  console.log(`Email: ${newTeacher.email}`);
  console.log(`Password: Any password (local DB bypasses password check if Supabase is inactive, or use the Supabase password if configured).`);
  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
