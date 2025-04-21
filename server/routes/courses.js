const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/auth');

// Routes for /api/courses
router.route('/')
  .get(courseController.getCourses)
  .post(protect, courseController.createCourse);

// Routes for /api/courses/:id
router.route('/:id')
  .get(courseController.getCourse)
  .put(protect, courseController.updateCourse)
  .delete(protect, courseController.deleteCourse);

// Course statistics route
router.get('/:courseId/stats', protect, courseController.getCourseStats);

module.exports = router; 