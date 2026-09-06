const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const author = await prisma.author.findFirst({
    where: { name: { contains: 'Geetanjali' } },
    include: {
      eventAuthors: {
        where: { eventId: 115 },
        include: { event: true }
      },
      eventBooks: {
        where: { eventId: 115 }
      }
    }
  });

  console.log(JSON.stringify(author, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
