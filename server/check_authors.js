const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const authors = await prisma.author.findMany({ where: { isArchived: false } });
  console.log("Total authors:", authors.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
