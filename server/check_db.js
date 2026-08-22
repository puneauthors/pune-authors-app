const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['about_page_image', 'invite_author_banner_image'] } }
  });
  console.log('DB count:', settings.length);
  settings.forEach(s => console.log(s.key, s.value.substring(0, 50)));
}
run().catch(console.error).finally(() => { prisma.$disconnect(); });
