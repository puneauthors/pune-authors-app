const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const books = await prisma.book.findMany({
    where: { authorId: 143 },
    select: { id: true, title: true, isArchived: true }
  });
  console.log(books);
}
run();
