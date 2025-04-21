const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session must have a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Session must have a description'],
    trim: true
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Session must be linked to a course']
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Session must have an instructor']
  },
  startDate: {
    type: Date,
    required: [true, 'Session must have a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Session must have an end date']
  },
  meetingLink: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure the session end time is after the start time
sessionSchema.pre('validate', function(next) {
  if (this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session; 