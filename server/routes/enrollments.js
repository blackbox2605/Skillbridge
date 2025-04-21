const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { protect } = require('../middleware/auth');

// Get all enrolled courses for the current student
router.get('/', protect, enrollmentController.getEnrolledCourses);

// Enroll in a course
router.post('/:courseId', protect, enrollmentController.enrollCourse);

// Cancel enrollment
router.delete('/:enrollmentId', protect, enrollmentController.cancelEnrollment);

module.exports = router; 