const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    where: { authorId: 138 }
  });
  console.log(books.map(b => b.title + ' -> ' + b.isbn).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
