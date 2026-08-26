const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { isAdmin, verifyToken } = require('../middleware/auth');
const { sendNotificationEmail, emailWrap } = require('../utils/email');
const { parseEventRequestMessage } = require('../utils/helpers');
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

    // Send confirmation email to the request maker
    if (inq.email && typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const parsed = parseEventRequestMessage(inq.message);
      const recipientName = parsed.proposer || inq.name || "Organizer";
      const orgName = parsed.organisation;
      const eventActivity = parsed.activities || parsed.category || "Literary Event";
      const eventDate = parsed.date;
      const eventLocation = parsed.location;

      const userContent = `
        <p>Dear ${recipientName},</p>
        <p>We are delighted to inform you that your event request has been <strong style="color: #16a34a;">CONFIRMED &amp; ACCEPTED</strong> by the Pune Authors' Association!</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          ${orgName ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px; width: 35%;">Organisation</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${orgName}</td></tr>` : ''}
          <tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Proposer Name</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${recipientName}</td></tr>
          ${parsed.designation ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Designation</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${parsed.designation}</td></tr>` : ''}
          <tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Event Activity</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${eventActivity}</td></tr>
          ${parsed.category ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Category</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${parsed.category}</td></tr>` : ''}
          ${eventDate ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Proposed Date</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${eventDate}</td></tr>` : ''}
          ${parsed.time ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Proposed Time</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${parsed.time}</td></tr>` : ''}
          ${eventLocation ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Location / Venue</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${eventLocation}</td></tr>` : ''}
          <tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Status</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;"><span style="display: inline-block; background: #16a34a; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">Confirmed / Accepted</span></td></tr>
        </table>

        <p><strong>Next Steps:</strong></p>
        <p>Our operations team will be in touch with you shortly to coordinate author line-ups, schedules, setup requirements, and event logistics.</p>
        <p>Thank you for collaborating with Pune Authors' Association to celebrate literature and culture!</p>
        <p>Warm regards,<br><strong>Pune Authors' Association</strong></p>
      `;

      sendNotificationEmail(
        inq.email,
        `Event Request Confirmed: ${orgName || recipientName} - Pune Authors' Association`,
        emailWrap("Event Request Confirmed", userContent)
      );
    }
    
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

    // Send rejection/update email to the request maker
    if (inq.email && typeof sendNotificationEmail === 'function' && typeof emailWrap === 'function') {
      const parsed = parseEventRequestMessage(inq.message);
      const recipientName = parsed.proposer || inq.name || "Organizer";
      const orgName = parsed.organisation;
      const eventActivity = parsed.activities || parsed.category || "Literary Event";
      const eventDate = parsed.date;

      const userContent = `
        <p>Dear ${recipientName},</p>
        <p>Thank you for submitting your event proposal for <strong>${orgName || recipientName}</strong> to the Pune Authors' Association.</p>
        <p>After reviewing our current schedule and logistical availability, we regret to inform you that we are unable to accept this event request at this time.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          ${orgName ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px; width: 35%;">Organisation</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${orgName}</td></tr>` : ''}
          <tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Proposer Name</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${recipientName}</td></tr>
          ${eventActivity ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Event Activity</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${eventActivity}</td></tr>` : ''}
          ${eventDate ? `<tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Proposed Date</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;">${eventDate}</td></tr>` : ''}
          <tr><th style="background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px;">Status</th><td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f4;"><span style="display: inline-block; background: #ef4444; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">Declined</span></td></tr>
        </table>

        <p>We sincerely appreciate your interest in collaborating with Pune Authors' Association. Please feel free to reach out to us again for future events or alternate schedules.</p>
        <p>Warm regards,<br><strong>Pune Authors' Association</strong></p>
      `;

      sendNotificationEmail(
        inq.email,
        `Event Request Update: ${orgName || recipientName} - Pune Authors' Association`,
        emailWrap("Event Request Update", userContent)
      );
    }
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject event request' });
  }
});

module.exports = router;
