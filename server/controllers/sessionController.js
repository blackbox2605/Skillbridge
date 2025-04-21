const Session = require('../models/Session');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Create a new session
exports.createSession = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check if user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can create sessions'
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

    // Check if the instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only create sessions for your own courses'
      });
    }

    // Create session
    const session = await Session.create({
      ...req.body,
      course: courseId,
      instructor: req.user.id
    });

    res.status(201).json({
      success: true,
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create session'
    });
  }
};

// Get sessions for a course
exports.getCourseSessions = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If user is a student, check if enrolled
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: courseId,
        status: 'active'
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to view sessions'
        });
      }
    }
    // If instructor, check if owns the course
    else if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view sessions for your own courses'
      });
    }

    // Get sessions, sorted by start date
    const sessions = await Session.find({ course: courseId })
      .sort('startDate')
      .populate('instructor', 'name email');

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: {
        sessions
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sessions'
    });
  }
};

// Get upcoming sessions for a student
exports.getUpcomingSessions = async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their upcoming sessions'
      });
    }

    // Get courses the student is enrolled in
    const enrollments = await Enrollment.find({
      student: req.user.id,
      status: 'active'
    });

    const enrolledCourseIds = enrollments.map(enrollment => enrollment.course);

    // Get upcoming sessions for enrolled courses
    const now = new Date();
    const sessions = await Session.find({
      course: { $in: enrolledCourseIds },
      startDate: { $gt: now }
    })
      .sort('startDate')
      .populate('course', 'name')
      .populate('instructor', 'name email');

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: {
        sessions
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch upcoming sessions'
    });
  }
};

// Update a session
exports.updateSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    let session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the instructor who created the session
    if (session.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update sessions you created'
      });
    }

    // Update session
    session = await Session.findByIdAndUpdate(
      sessionId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update session'
    });
  }
};

// Delete a session
exports.deleteSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the instructor who created the session
    if (session.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete sessions you created'
      });
    }

    await session.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete session'
    });
  }
}; 