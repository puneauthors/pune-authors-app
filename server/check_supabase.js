const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkSupabase() {
  const docs = await prisma.notification.findMany({ where: { documentUrl: { not: null } }});
  console.log(docs);
}
checkSupabase();
