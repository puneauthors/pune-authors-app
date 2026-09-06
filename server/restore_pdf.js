const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreDocument() {
  try {
    const existing = await prisma.notification.findFirst({
      where: { documentName: "Stall Manager Task Description.pdf" }
    });
    
    if (existing) {
      console.log("Stall Manager already exists in DB");
    } else {
      await prisma.notification.create({
        data: {
          message: "Stall Manager Task Description",
          target: "ALL",
          documentName: "Stall Manager Task Description.pdf",
          documentUrl: "/uploads/1784016093648-911044438-Stall Manager Task Description.pdf",
          createdAt: new Date("2026-07-14T08:01:00.000Z")
        }
      });
      console.log("Successfully restored Stall Manager Task Description to the database!");
    }
  } catch (err) {
    console.error("Error restoring:", err);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDocument();
