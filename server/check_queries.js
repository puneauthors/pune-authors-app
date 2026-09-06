const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const books = await prisma.book.findMany({
    where: {
      author: {
        status: 'Active'
      },
      isArchived: false
    },
    include: { author: true }
  });
  const found = books.filter(b => b.author.name.includes('Sritapa') || b.author.name.includes('Siddharth'));
  console.log("Found in admin query:", found);
  
  const publicBooks = await prisma.book.findMany({
    where: { status: 'Approved', isArchived: false, author: { isArchived: false } },
    include: { author: true }
  });
  const foundPublic = publicBooks.filter(b => b.author.name.includes('Sritapa') || b.author.name.includes('Siddharth'));
  console.log("Found in public query:", foundPublic);
}
run();
