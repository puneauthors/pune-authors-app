const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const eventBooks = await prisma.eventBook.findMany({
    where: { authorId: { in: [140, 143] } },
    include: { book: true, event: true }
  });
  console.log(eventBooks);
  
  const eventAuthors = await prisma.eventAuthor.findMany({
    where: { authorId: { in: [140, 143] } }
  });
  console.log(eventAuthors);
}
run();
