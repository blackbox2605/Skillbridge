const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Create new course
exports.createCourse = async (req, res) => {
  try {
    // Add the instructor ID from the authenticated user
    req.body.instructor = req.user.id;

    // Check if user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can create courses'
      });
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: {
        course
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create course'
    });
  }
};

// Get all courses (with optional filtering)
exports.getCourses = async (req, res) => {
  try {
    let query = {};

    // If user is an instructor, only show their courses
    if (req.user && req.user.role === 'instructor') {
      query.instructor = req.user.id;
      console.log(`Filtering courses for instructor: ${req.user.id}`);
    }

    // Allow filtering by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    console.log('Course query:', query);

    const courses = await Course.find(query)
      .populate({
        path: 'instructor',
        select: 'name email'
      })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: {
        courses
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch courses'
    });
  }
};

// Get single course
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: 'instructor',
      select: 'name email'
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        course
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch course'
    });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Make sure user is the course instructor
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: {
        course
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update course'
    });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Make sure user is the course instructor
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete course'
    });
  }
};

// Get course enrollment statistics (instructors only)
exports.getCourseStats = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const instructorId = req.user.id;

    // Check if user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can view course statistics'
      });
    }

    // Check if the course exists and belongs to the instructor
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission to access it'
      });
    }

    // Get enrollment statistics
    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'active'
    });

    // Calculate total earnings
    const totalEarnings = enrollments.reduce((total, enrollment) => {
      return total + (enrollment.paymentInfo?.amount || 0);
    }, 0);

    const stats = {
      enrolledStudents: enrollments.length,
      totalEarnings: totalEarnings
    };

    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Error getting course statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course statistics'
    });
  }
}; 