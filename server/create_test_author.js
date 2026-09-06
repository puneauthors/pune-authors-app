const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'test.author@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if User exists
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Test Author',
        email,
        password: hashedPassword,
        role: 'AUTHOR',
        phone: '9999999999'
      }
    });
    console.log(`Created new User with ID: ${user.id}`);
  } else {
    console.log(`User already exists with ID: ${user.id}`);
  }

  // Check if Author exists
  let author = await prisma.author.findUnique({ where: { email } });

  if (!author) {
    author = await prisma.author.create({
      data: {
        name: 'Test Author',
        email: email,
        phone: '9999999999',
        bio: 'I am a test author',
        status: 'Approved'
      }
    });
    console.log(`Created new Test Author with ID: ${author.id}`);
  } else {
    console.log(`Test Author already exists with ID: ${author.id}`);
  }

  // Create a mock book for the author
  const bookTitle = 'The Art of Testing';
  let book = await prisma.book.findFirst({
    where: { authorId: author.id, title: bookTitle }
  });

  if (!book) {
    book = await prisma.book.create({
      data: {
        authorId: author.id,
        title: bookTitle,
        mrp: 500,
        stock: 50,
        status: 'Approved',
        coverUrl: '/uploads/test_cover.jpg',
        genre: 'Fiction',
        synopsis: 'A book about software testing'
      }
    });
    console.log(`Created mock book for author with ID: ${book.id}`);
  } else {
    console.log(`Mock book already exists with ID: ${book.id}`);
  }

  // Make sure they have an EventAuthor entry for Ahmedabad Book Fair (115)
  // Let's find Event 115
  const eventId = 115;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  
  if (event) {
     let eventAuthor = await prisma.eventAuthor.findFirst({
        where: { eventId, authorId: author.id }
     });
     if (!eventAuthor) {
        eventAuthor = await prisma.eventAuthor.create({
           data: {
              eventId,
              authorId: author.id,
              optInStatus: 'Approved',
              paymentStatus: 'Unpaid'
           }
        });
        console.log(`Created EventAuthor for Event 115 (Approved, Unpaid)`);
     } else {
        console.log(`EventAuthor for Event 115 already exists`);
     }
     
     let eventBook = await prisma.eventBook.findFirst({
        where: { eventId, authorId: author.id, bookId: book.id }
     });
     if (!eventBook) {
        await prisma.eventBook.create({
           data: {
              eventId,
              authorId: author.id,
              bookId: book.id,
              listedStock: 10,
              soldStock: 0,
              returnedStock: 0
           }
        });
        console.log(`Created EventBook for Event 115`);
     } else {
        console.log(`EventBook for Event 115 already exists`);
     }
  }

  console.log('\n--- Login Credentials ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('-------------------------');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
