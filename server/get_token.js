const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const author = await prisma.author.findFirst({
    where: { email: 'author149@example.com' } // Wait, I don't know her exact email.
  });
  // let's just find by ID
  const a = await prisma.author.findUnique({ where: { id: 149 }});
  if (a) {
    const token = jwt.sign({ id: a.id, email: a.email, role: 'AUTHOR' }, process.env.JWT_SECRET || 'paa_secret_key', { expiresIn: '1d' });
    console.log(`Token for Geetanjali (${a.email}):`);
    console.log(token);
  }
}
main();
