const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    where: { title: { contains: 'Dinosaur', mode: 'insensitive' } },
    include: { author: true }
  });
  console.log(JSON.stringify(books, null, 2));

  const books2 = await prisma.book.findMany({
    where: { title: { contains: 'Ink for Soul', mode: 'insensitive' } },
    include: { author: true }
  });
  console.log(JSON.stringify(books2, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
