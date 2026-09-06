const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const books = await prisma.book.findMany({
    where: { author: { name: { contains: 'Nina', mode: 'insensitive' } } },
    select: { id: true, title: true, coverUrl: true }
  });
  console.log(books);
}
run();
