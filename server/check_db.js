const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  try {
    const allDocs = await prisma.notification.findMany({
      where: {
        documentUrl: {
          not: null
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log("=== ALL ADMIN DOCUMENTS IN DB ===");
    console.log(`Total Documents Found: ${allDocs.length}`);
    console.log(JSON.stringify(allDocs, null, 2));
    
  } catch (err) {
    console.error("Error querying DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
