const Review = require('../models/Review');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Get all reviews for a specific course
exports.getCourseReviews = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const reviews = await Review.find({ course: courseId })
      .populate({
        path: 'student',
        select: 'name'
      })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Add a review to a course
exports.addReview = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const studentId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can review courses'
      });
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to leave a review'
      });
    }

    // Check if student has already reviewed this course
    const existingReview = await Review.findOne({
      student: studentId,
      course: courseId
    });

    // If review exists, update it instead of creating a new one
    if (existingReview) {
      existingReview.rating = req.body.rating;
      existingReview.comment = req.body.comment;
      await existingReview.save();

      return res.status(200).json({
        success: true,
        data: {
          review: existingReview
        },
        message: 'Review updated successfully'
      });
    }

    // Create the review
    const review = await Review.create({
      student: studentId,
      course: courseId,
      rating: req.body.rating,
      comment: req.body.comment
    });

    res.status(201).json({
      success: true,
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add review'
    });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if the user is the owner of the review
    if (review.student.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    await review.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
};

// Get course average rating
exports.getCourseAverageRating = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    const reviews = await Review.find({ course: courseId });
    
    if (reviews.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          averageRating: 0,
          reviewCount: 0
        }
      });
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    res.status(200).json({
      success: true,
      data: {
        averageRating,
        reviewCount: reviews.length
      }
    });
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate average rating'
    });
  }
}; 