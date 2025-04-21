const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, restrictTo } = require('../middleware/auth');
const {
  getCourseReviews,
  addReview,
  deleteReview,
  getCourseAverageRating
} = require('../controllers/reviewController');

// Get all reviews for a course
router.get('/', getCourseReviews);

// Get average rating for a course
router.get('/average', getCourseAverageRating);

// Add a review to a course
router.post('/', protect, restrictTo('student'), addReview);

// Delete a review
router.delete('/:reviewId', protect, restrictTo('student', 'admin'), deleteReview);

module.exports = router; 