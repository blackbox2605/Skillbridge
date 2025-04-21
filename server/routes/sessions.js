const express = require('express');
const router = express.Router({ mergeParams: true });
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

// Create a new session for a course
router.post('/', protect, sessionController.createSession);

// Get all sessions for a course
router.get('/', protect, sessionController.getCourseSessions);

// Get all upcoming sessions for enrolled courses (student only)
router.get('/upcoming', protect, sessionController.getUpcomingSessions);

// Update a session
router.put('/:sessionId', protect, sessionController.updateSession);

// Delete a session
router.delete('/:sessionId', protect, sessionController.deleteSession);

module.exports = router; 