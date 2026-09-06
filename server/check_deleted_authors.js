const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const authors = await prisma.author.findMany({
    where: {
      name: { in: ['Siddharth Sen', 'Sritapa Mahanty'] }
    },
    include: {
      books: true
    }
  });
  console.log("Found Authors:");
  console.dir(authors, { depth: null });
  
  const booksByTheseAuthors = await prisma.book.findMany({
    where: {
      author: {
        name: { in: ['Siddharth Sen', 'Sritapa Mahanty'] }
      }
    }
  });
  console.log("\nFound Books by these authors:");
  console.dir(booksByTheseAuthors, { depth: null });
}
run();
