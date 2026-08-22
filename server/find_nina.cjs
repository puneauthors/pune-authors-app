const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const authors = await prisma.author.findMany({
    where: { name: { contains: 'Nina', mode: 'insensitive' } },
    include: { books: true }
  });
  console.log(JSON.stringify(authors, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
