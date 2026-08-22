require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.systemSetting.findMany().then(r => console.log(r)).catch(console.error).finally(() => prisma.$disconnect());
