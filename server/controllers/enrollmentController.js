const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Enroll in a course
exports.enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const studentId = req.user.id;
    const { paymentInfo } = req.body;

    // Check if the user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can enroll in courses'
      });
    }

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if enrollment deadline has passed
    if (course.enrollmentDeadline && new Date() > new Date(course.enrollmentDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment deadline has passed for this course'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Verify payment
    if (!paymentInfo || !paymentInfo.paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment information is required for enrollment'
      });
    }

    // In a production environment, you would verify the payment with Razorpay API
    // For this implementation, we'll just check if paymentId exists

    // Create new enrollment with payment information
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      paymentInfo: {
        paymentId: paymentInfo.paymentId,
        amount: paymentInfo.amount || course.price,
        currency: 'INR',
        status: 'completed',
        date: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        enrollment
      }
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to enroll in course'
    });
  }
};

// Get enrolled courses for a student
exports.getEnrolledCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id, status: 'active' })
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'name email'
        }
      });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: {
        enrollments
      }
    });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch enrolled courses'
    });
  }
};

// Cancel enrollment
exports.cancelEnrollment = async (req, res) => {
  try {
    const enrollmentId = req.params.enrollmentId;

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Verify ownership
    if (enrollment.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this enrollment'
      });
    }

    // Update status to canceled
    enrollment.status = 'canceled';
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error canceling enrollment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel enrollment'
    });
  }
}; 