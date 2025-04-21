const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide course name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide course description'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Please provide course price'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: Number,
    required: [true, 'Please provide course duration in hours'],
    min: [1, 'Duration must be at least 1 hour']
  },
  category: {
    type: String,
    required: [true, 'Please provide course category'],
    trim: true
  },
  enrollmentDeadline: {
    type: Date,
    default: null, // No deadline by default
    required: false
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Course must belong to an instructor']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for better query performance
courseSchema.index({ instructor: 1 });

// Add virtual property to check if enrollment is open
courseSchema.virtual('isEnrollmentOpen').get(function() {
  if (!this.enrollmentDeadline) return true; // No deadline means always open
  return new Date() < new Date(this.enrollmentDeadline);
});

// Make virtuals available when converting to JSON
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course; 