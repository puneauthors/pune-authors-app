const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const authors = await prisma.author.findMany({
    where: {
      name: { in: ['Siddharth Sen', 'Sritapa Mahanty'] }
    },
    select: { id: true, name: true, isArchived: true }
  });
  console.log("Authors:");
  console.log(authors);
  
  const books = await prisma.book.findMany({
    where: {
      author: {
        name: { in: ['Siddharth Sen', 'Sritapa Mahanty'] }
      }
    },
    select: { id: true, title: true, isArchived: true, authorId: true }
  });
  console.log("\nBooks:");
  console.log(books);
}
run();
