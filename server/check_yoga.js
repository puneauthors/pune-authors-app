const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const books = await prisma.book.findMany({
    where: { title: { contains: 'Yoga', mode: 'insensitive' } },
    select: { id: true, title: true, genre: true, subGenre: true, status: true, authorId: true }
  });
  console.log(JSON.stringify(books, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
