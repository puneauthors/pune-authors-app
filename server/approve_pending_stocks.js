const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const pendingHistories = await prisma.stockHistory.findMany({
    where: { status: 'Pending' }
  });

  if (pendingHistories.length === 0) {
    console.log('No pending stock histories found.');
    return;
  }

  console.log(`Found ${pendingHistories.length} pending stock histories.`);

  for (const history of pendingHistories) {
    // Approve the history
    await prisma.stockHistory.update({
      where: { id: history.id },
      data: { status: 'Approved' }
    });

    // Update the book's stock
    const book = await prisma.book.findUnique({ where: { id: history.bookId } });
    if (book) {
      await prisma.book.update({
        where: { id: book.id },
        data: { stock: book.stock + history.changeQty }
      });
      console.log(`Updated book ${book.id} stock by ${history.changeQty}`);
    }
  }
  console.log('All pending stocks approved.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
