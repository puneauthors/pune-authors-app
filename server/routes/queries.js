const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { isAdmin, verifyToken } = require('../middleware/auth');
const { sendNotificationEmail, emailWrap } = require('../utils/email');
const { upload } = require('../config/upload');

const countWords = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

// --- QUERIES (SUPPORT) ---

// Author: Get their own queries
router.get('/api/author/queries', verifyToken, async (req, res) => {
  try {
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });
    const queries = await prisma.query.findMany({
      where: { authorId: author.id },
      include: { 
        author: { select: { name: true, email: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(queries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Author: Create a new query
router.post('/api/author/queries', verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const wordCount = countWords(message);
    if (wordCount > 100) {
      return res.status(400).json({ error: `Query message cannot exceed 100 words (Current: ${wordCount} words).` });
    }
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });
    const query = await prisma.query.create({
      data: {
        authorId: author.id,
        subject,
        message
      }
    });
    res.status(201).json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create query' });
  }
});

// Admin: Get all queries
router.get('/api/admin/queries', verifyToken, isAdmin, async (req, res) => {
  try {
    const queries = await prisma.query.findMany({
      include: { 
        author: { select: { name: true, email: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const mappedQueries = queries.map(q => ({ ...q, itemType: 'Query' }));

    const inquiries = await prisma.contactInquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const mappedInquiries = inquiries.map(i => ({
      id: `inq_${i.id}`,
      originalId: i.id,
      subject: 'Contact Form Inquiry',
      message: i.message,
      author: { name: i.name, email: i.email },
      status: 'Unread',
      itemType: 'Message',
      createdAt: i.createdAt
    }));

    const combined = [...mappedQueries, ...mappedInquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch all queries' });
  }
});

// Admin: Reply to a query
router.put('/api/admin/queries/:id/reply', verifyToken, isAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    const wordCount = countWords(reply);
    if (wordCount > 100) {
      return res.status(400).json({ error: `Reply message cannot exceed 100 words (Current: ${wordCount} words).` });
    }
    const id = parseInt(req.params.id);
    const queryToUpdate = await prisma.query.findUnique({ where: { id } });
    const updatedReply = queryToUpdate.reply ? `${queryToUpdate.reply}\n\n---\n\nAdmin: ${reply}` : `Admin: ${reply}`;
    
    const query = await prisma.query.update({
      where: { id },
      data: {
        reply: updatedReply,
        status: 'Answered'
      },
      include: { user: true }
    });
    
    if (query.user && query.user.email) {
      await sendNotificationEmail(query.user.email, 'Support Query Update', `Admin has replied to your query:\n\nSubject: ${query.subject}\nReply: ${reply}`);
    }
    
    res.json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reply to query' });
  }
});

// Admin: Resolve a query
router.put('/api/admin/queries/:id/resolve', verifyToken, isAdmin, async (req, res) => {
  try {
    const idStr = req.params.id;
    if (typeof idStr === 'string' && idStr.startsWith('inq_')) {
      const inquiryId = parseInt(idStr.replace('inq_', ''));
      await prisma.contactInquiry.delete({
        where: { id: inquiryId }
      });
      return res.json({ success: true, message: "Inquiry resolved and removed" });
    }

    const id = parseInt(idStr);
    const query = await prisma.query.update({
      where: { id },
      data: { status: 'Resolved' },
      include: { user: true }
    });
    
    if (query.user && query.user.email) {
      await sendNotificationEmail(query.user.email, 'Support Query Resolved', `Your support query has been marked as resolved:\n\nSubject: ${query.subject}`);
    }
    
    res.json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve query' });
  }
});

// Author: Reply to a query
router.put('/api/author/queries/:id/reply', verifyToken, async (req, res) => {
  try {
    const { reply } = req.body;
    const wordCount = countWords(reply);
    if (wordCount > 100) {
      return res.status(400).json({ error: `Reply message cannot exceed 100 words (Current: ${wordCount} words).` });
    }
    const id = parseInt(req.params.id);
    const author = await prisma.author.findUnique({ where: { email: req.user.email } });
    if (!author) return res.status(403).json({ error: 'Not an author' });
    
    const query = await prisma.query.findUnique({ where: { id } });
    if (query.authorId !== author.id) return res.status(403).json({ error: 'Not authorized for this query' });
    
    const queryToUpdate = await prisma.query.findUnique({ where: { id } });
    const updatedReply = queryToUpdate.reply ? `${queryToUpdate.reply}\n\n---\n\nAuthor (${author.name}): ${reply}` : `Author (${author.name}): ${reply}`;
    
    const updatedQuery = await prisma.query.update({
      where: { id },
      data: {
        reply: updatedReply,
        status: 'Answered'
      },
      include: { user: true }
    });
    
    if (updatedQuery.user && updatedQuery.user.email) {
      await sendNotificationEmail(updatedQuery.user.email, 'Author Replied to Your Query', `${author.name} has replied to your query:\n\nSubject: ${updatedQuery.subject}\nReply: ${reply}`);
    }
    
    res.json(updatedQuery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reply to query' });
  }
});


// Customer: Get their own queries
router.get('/api/customer/queries', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user.email } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const queries = await prisma.query.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(queries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Customer: Create a new query
router.post('/api/customer/queries', verifyToken, async (req, res) => {
  try {
    const { subject, message, authorId } = req.body;
    const wordCount = countWords(message);
    if (wordCount > 100) {
      return res.status(400).json({ error: `Query message cannot exceed 100 words (Current: ${wordCount} words).` });
    }
    const user = await prisma.user.findUnique({ where: { email: req.user.email } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const query = await prisma.query.create({
      data: {
        userId: user.id,
        authorId: authorId ? parseInt(authorId) : null,
        subject,
        message
      }
    });
    res.status(201).json(query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create query' });
  }
});

// Customer: Reply to a query
router.put('/api/customer/queries/:id/reply', verifyToken, async (req, res) => {
  try {
    const { reply } = req.body;
    const wordCount = countWords(reply);
    if (wordCount > 100) {
      return res.status(400).json({ error: `Reply message cannot exceed 100 words (Current: ${wordCount} words).` });
    }
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { email: req.user.email } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    const query = await prisma.query.findUnique({ where: { id } });
    if (query.userId !== user.id) return res.status(403).json({ error: 'Not authorized for this query' });
    
    const updatedReply = query.reply ? `${query.reply}\n\n---\n\nCustomer: ${reply}` : `Customer: ${reply}`;
    
    const updatedQuery = await prisma.query.update({
      where: { id },
      data: {
        reply: updatedReply,
        status: 'Pending'
      }
    });
    
    res.json(updatedQuery);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reply to query' });
  }
});

// Admin: Delete a query
router.delete('/api/admin/queries/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const idStr = req.params.id;
    if (typeof idStr === 'string' && idStr.startsWith('inq_')) {
      const inquiryId = parseInt(idStr.replace('inq_', ''));
      await prisma.contactInquiry.delete({
        where: { id: inquiryId }
      });
      return res.json({ success: true });
    }

    const id = parseInt(idStr);
    await prisma.query.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete query' });
  }
});

// Admin: Accept an event request
router.put('/api/admin/event-requests/:id/accept', verifyToken, isAdmin, async (req, res) => {
  try {
    const idStr = req.params.id;
    let inquiryId;
    if (idStr.startsWith('inq_')) {
      inquiryId = parseInt(idStr.replace('inq_', ''));
    } else {
      inquiryId = parseInt(idStr);
    }
    
    const inq = await prisma.contactInquiry.findUnique({ where: { id: inquiryId } });
    if (!inq) {
      return res.status(404).json({ error: 'Event request not found' });
    }
    
    let newMsg = inq.message;
    if (newMsg.includes('[STATUS:')) {
      newMsg = newMsg.replace(/\[STATUS:\s*\w+\]/g, '[STATUS: Accepted]');
    } else {
      newMsg = `${newMsg}\n\n[STATUS: Accepted]`;
    }
    
    const updated = await prisma.contactInquiry.update({
      where: { id: inquiryId },
      data: { message: newMsg }
    });
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept event request' });
  }
});

// Admin: Reject an event request
router.put('/api/admin/event-requests/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const idStr = req.params.id;
    let inquiryId;
    if (idStr.startsWith('inq_')) {
      inquiryId = parseInt(idStr.replace('inq_', ''));
    } else {
      inquiryId = parseInt(idStr);
    }
    
    const inq = await prisma.contactInquiry.findUnique({ where: { id: inquiryId } });
    if (!inq) {
      return res.status(404).json({ error: 'Event request not found' });
    }
    
    let newMsg = inq.message;
    if (newMsg.includes('[STATUS:')) {
      newMsg = newMsg.replace(/\[STATUS:\s*\w+\]/g, '[STATUS: Rejected]');
    } else {
      newMsg = `${newMsg}\n\n[STATUS: Rejected]`;
    }
    
    const updated = await prisma.contactInquiry.update({
      where: { id: inquiryId },
      data: { message: newMsg }
    });
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject event request' });
  }
});

module.exports = router;
