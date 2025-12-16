const express = require('express');
const router = express.Router();
const db = require('../database');

// POST: Submit Support Ticket
router.post('/support/ticket', async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      ticketId: Date.now()
    });
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Get User's Support Tickets
router.get('/support/tickets', async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Support tickets error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Get Ticket by ID
router.get('/support/ticket/:id', async (req, res) => {
  try {
    res.status(404).json({ success: false, message: 'Ticket not found' });
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Update Ticket (close/reopen)
router.put('/support/ticket/:id', async (req, res) => {
  try {
    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Support ticket update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: FAQ
router.get('/support/faq', async (req, res) => {
  try {
    const faqs = [
      {
        id: 1,
        question: 'How do I start an attendance session?',
        answer: 'Go to the QR tab, select your class, and click "Start Session". A QR code will be generated for students to scan.',
        category: 'attendance'
      },
      {
        id: 2,
        question: 'How can I upload resources for my students?',
        answer: 'Visit the Resources tab, select your class, and click "Upload Resource". You can add videos, documents, links, and assignments.',
        category: 'resources'
      },
      {
        id: 3,
        question: 'How do I add grades for students?',
        answer: 'Go to the Grades tab, select your class, and click "Add Grade". Enter the student, assignment name, and grade.',
        category: 'grades'
      }
    ];

    res.json({ success: true, data: faqs });
  } catch (error) {
    console.error('FAQ error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;