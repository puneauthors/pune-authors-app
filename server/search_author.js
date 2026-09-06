const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const authors = await prisma.author.findMany({
    where: { name: { contains: 'Sidd', mode: 'insensitive' } },
    select: { id: true, name: true, isArchived: true }
  });
  console.log(authors);
}
run();
