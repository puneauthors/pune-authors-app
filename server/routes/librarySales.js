const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ==========================================
// ADMIN ROUTES: LIBRARY SALES
// ==========================================

// Helper to auto-sync non-archived donation registrations to LibraryBookSale
async function autoSyncDonationsToLibrarySales() {
  try {
    const registrations = await prisma.donationRegistration.findMany({
      where: { isArchived: false },
      include: {
        announcement: true,
        books: true
      }
    });

    const map = new Map();
    registrations.forEach(r => {
      const libraryId = r.announcement?.libraryId;
      const authorId = r.authorId;
      if (!libraryId || !authorId) return;

      r.books.forEach(b => {
        const bookId = b.bookId;
        const qty = b.quantityDonated || 0;
        if (!bookId) return;

        const key = `${libraryId}_${bookId}_${authorId}`;
        if (!map.has(key)) {
          map.set(key, { libraryId, bookId, authorId, copiesPlaced: 0 });
        }
        map.get(key).copiesPlaced += qty;
      });
    });

    // Check existing in 1 query
    const existing = await prisma.libraryBookSale.findMany({
      select: { libraryId: true, bookId: true, authorId: true }
    });
    const existingKeys = new Set(existing.map(e => `${e.libraryId}_${e.bookId}_${e.authorId}`));

    const toCreate = [];
    for (const [key, item] of map.entries()) {
      if (!existingKeys.has(key)) {
        toCreate.push({
          libraryId: item.libraryId,
          bookId: item.bookId,
          authorId: item.authorId,
          copiesPlaced: item.copiesPlaced,
          soldStock: 0,
          isArchived: false
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.libraryBookSale.createMany({
        data: toCreate,
        skipDuplicates: true
      });
    }
  } catch (err) {
    console.error('Auto-sync donations to library sales error:', err);
  }
}

// Get all library sales records with library, author, and book details
router.get('/api/admin/library-sales', verifyToken, isAdmin, async (req, res) => {
  try {
    await autoSyncDonationsToLibrarySales();

    const { libraryId } = req.query;
    const where = { isArchived: false };
    if (libraryId) {
      where.libraryId = parseInt(libraryId);
    }

    const sales = await prisma.libraryBookSale.findMany({
      where,
      include: {
        library: true,
        book: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            penName: true
          }
        }
      },
      orderBy: [
        { libraryId: 'asc' },
        { authorId: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ success: true, sales });
  } catch (error) {
    console.error('Error fetching admin library sales:', error);
    res.status(500).json({ error: 'Failed to fetch library sales' });
  }
});

// Get all active libraries with total sales metrics
router.get('/api/admin/library-sales/libraries', verifyToken, isAdmin, async (req, res) => {
  try {
    await autoSyncDonationsToLibrarySales();

    const libraries = await prisma.library.findMany({
      where: { isArchived: false },
      include: {
        bookSales: {
          where: { isArchived: false },
          include: {
            book: true,
            author: {
              select: { id: true, name: true, penName: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const detailedLibraries = libraries.map(lib => {
      let totalPlaced = 0;
      let totalSold = 0;
      let totalRevenue = 0;
      const uniqueAuthors = new Set();
      const uniqueBooks = new Set();

      (lib.bookSales || []).forEach(bs => {
        const placed = bs.copiesPlaced || 0;
        const sold = bs.soldStock || 0;
        const mrp = bs.overrideMrp || bs.book?.mrp || 0;
        totalPlaced += placed;
        totalSold += sold;
        totalRevenue += (sold * mrp);
        if (bs.authorId) uniqueAuthors.add(bs.authorId);
        if (bs.bookId) uniqueBooks.add(bs.bookId);
      });

      return {
        ...lib,
        totalPlaced,
        totalSold,
        totalRevenue,
        totalAuthors: uniqueAuthors.size,
        totalTitles: uniqueBooks.size
      };
    });

    res.json({ success: true, libraries: detailedLibraries });
  } catch (error) {
    console.error('Error fetching libraries for sales:', error);
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

// Add or bulk update library book sales (Admin)
router.post('/api/admin/library-sales', verifyToken, isAdmin, async (req, res) => {
  try {
    const { libraryId, sales, bookId, authorId, copiesPlaced, soldStock, overrideMrp, notes } = req.body;

    if (sales && Array.isArray(sales)) {
      // Bulk upsert
      const results = [];
      for (const item of sales) {
        const lId = parseInt(item.libraryId || libraryId);
        const bId = parseInt(item.bookId);
        const aId = parseInt(item.authorId);

        if (!lId || !bId || !aId) continue;

        const record = await prisma.libraryBookSale.upsert({
          where: {
            libraryId_bookId_authorId: {
              libraryId: lId,
              bookId: bId,
              authorId: aId
            }
          },
          update: {
            copiesPlaced: item.copiesPlaced !== undefined ? parseInt(item.copiesPlaced) : undefined,
            soldStock: item.soldStock !== undefined ? parseInt(item.soldStock) : undefined,
            overrideMrp: item.overrideMrp !== undefined && item.overrideMrp !== "" ? parseFloat(item.overrideMrp) : null,
            notes: item.notes !== undefined ? item.notes : undefined,
            isArchived: false
          },
          create: {
            libraryId: lId,
            bookId: bId,
            authorId: aId,
            copiesPlaced: parseInt(item.copiesPlaced) || 0,
            soldStock: parseInt(item.soldStock) || 0,
            overrideMrp: item.overrideMrp ? parseFloat(item.overrideMrp) : null,
            notes: item.notes || null
          }
        });
        results.push(record);
      }
      return res.json({ success: true, count: results.length, sales: results });
    }

    // Single item
    const lId = parseInt(libraryId);
    const bId = parseInt(bookId);
    const aId = parseInt(authorId);

    if (!lId || !bId || !aId) {
      return res.status(400).json({ error: 'libraryId, bookId, and authorId are required' });
    }

    const record = await prisma.libraryBookSale.upsert({
      where: {
        libraryId_bookId_authorId: {
          libraryId: lId,
          bookId: bId,
          authorId: aId
        }
      },
      update: {
        copiesPlaced: copiesPlaced !== undefined ? parseInt(copiesPlaced) : undefined,
        soldStock: soldStock !== undefined ? parseInt(soldStock) : undefined,
        overrideMrp: overrideMrp !== undefined && overrideMrp !== "" ? parseFloat(overrideMrp) : null,
        notes: notes !== undefined ? notes : undefined,
        isArchived: false
      },
      create: {
        libraryId: lId,
        bookId: bId,
        authorId: aId,
        copiesPlaced: parseInt(copiesPlaced) || 0,
        soldStock: parseInt(soldStock) || 0,
        overrideMrp: overrideMrp ? parseFloat(overrideMrp) : null,
        notes: notes || null
      }
    });

    res.json({ success: true, sale: record });
  } catch (error) {
    console.error('Error saving library sale:', error);
    res.status(500).json({ error: 'Failed to save library sale' });
  }
});

// Update a single library sale entry
router.put('/api/admin/library-sales/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { copiesPlaced, soldStock, overrideMrp, notes } = req.body;

    const updated = await prisma.libraryBookSale.update({
      where: { id },
      data: {
        copiesPlaced: copiesPlaced !== undefined ? parseInt(copiesPlaced) : undefined,
        soldStock: soldStock !== undefined ? parseInt(soldStock) : undefined,
        overrideMrp: overrideMrp !== undefined && overrideMrp !== "" ? parseFloat(overrideMrp) : null,
        notes: notes !== undefined ? notes : undefined
      }
    });

    res.json({ success: true, sale: updated });
  } catch (error) {
    console.error('Error updating library sale:', error);
    res.status(500).json({ error: 'Failed to update library sale' });
  }
});

// Delete / Archive a library sale entry
router.delete('/api/admin/library-sales/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.libraryBookSale.delete({ where: { id } });
    res.json({ success: true, message: 'Library sale entry removed' });
  } catch (error) {
    console.error('Error deleting library sale:', error);
    res.status(500).json({ error: 'Failed to delete library sale' });
  }
});


// ==========================================
// AUTHOR ROUTES: LIBRARY SALES
// ==========================================

// Helper to get logged-in author
async function getAuthorFromReq(req) {
  if (req.user?.authorId) {
    const author = await prisma.author.findUnique({ where: { id: req.user.authorId } });
    if (author) return author;
  }
  if (req.user?.email) {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (author) return author;
  }
  return null;
}

// Fetch library sales for the logged-in author
router.get('/api/author/library-sales', verifyToken, async (req, res) => {
  try {
    await autoSyncDonationsToLibrarySales();

    const author = await getAuthorFromReq(req);
    if (!author) {
      return res.status(404).json({ error: 'Author profile not found' });
    }

    const sales = await prisma.libraryBookSale.findMany({
      where: {
        authorId: author.id,
        isArchived: false
      },
      include: {
        library: true,
        book: true
      },
      orderBy: [
        { library: { name: 'asc' } },
        { createdAt: 'desc' }
      ]
    });

    // Also send author's active books and all active libraries for easy selection
    const authorBooks = await prisma.book.findMany({
      where: { authorId: author.id, isArchived: false },
      select: { id: true, title: true, mrp: true, coverUrl: true, genre: true }
    });

    const allLibraries = await prisma.library.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, type: true, city: true, state: true }
    });

    res.json({
      success: true,
      sales,
      books: authorBooks,
      libraries: allLibraries
    });
  } catch (error) {
    console.error('Error fetching author library sales:', error);
    res.status(500).json({ error: 'Failed to fetch your library sales' });
  }
});

// Author updates or creates their own library sales record
router.post('/api/author/library-sales', verifyToken, async (req, res) => {
  try {
    const author = await getAuthorFromReq(req);
    if (!author) {
      return res.status(404).json({ error: 'Author profile not found' });
    }

    const { libraryId, bookId, copiesPlaced, soldStock, overrideMrp, notes } = req.body;
    const lId = parseInt(libraryId);
    const bId = parseInt(bookId);

    if (!lId || !bId) {
      return res.status(400).json({ error: 'libraryId and bookId are required' });
    }

    // Verify the book belongs to this author
    const book = await prisma.book.findFirst({
      where: { id: bId, authorId: author.id }
    });
    if (!book) {
      return res.status(403).json({ error: 'You do not have permission to manage this book' });
    }

    const record = await prisma.libraryBookSale.upsert({
      where: {
        libraryId_bookId_authorId: {
          libraryId: lId,
          bookId: bId,
          authorId: author.id
        }
      },
      update: {
        copiesPlaced: copiesPlaced !== undefined ? parseInt(copiesPlaced) : undefined,
        soldStock: soldStock !== undefined ? parseInt(soldStock) : undefined,
        overrideMrp: overrideMrp !== undefined && overrideMrp !== "" ? parseFloat(overrideMrp) : null,
        notes: notes !== undefined ? notes : undefined,
        isArchived: false
      },
      create: {
        libraryId: lId,
        bookId: bId,
        authorId: author.id,
        copiesPlaced: parseInt(copiesPlaced) || 0,
        soldStock: parseInt(soldStock) || 0,
        overrideMrp: overrideMrp ? parseFloat(overrideMrp) : null,
        notes: notes || null
      }
    });

    res.json({ success: true, sale: record });
  } catch (error) {
    console.error('Error updating author library sale:', error);
    res.status(500).json({ error: 'Failed to save your library sale entry' });
  }
});

// Public list of active libraries
router.get('/api/libraries', async (req, res) => {
  try {
    const libraries = await prisma.library.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, libraries });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

module.exports = router;
