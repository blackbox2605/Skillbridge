const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const sessionRoutes = require('./routes/sessions');
const materialRoutes = require('./routes/materials');
const reviewRoutes = require('./routes/reviews');

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Static files - for serving uploaded files
// Use absolute path for uploads directory
const uploadsPath = path.join(__dirname, '..', 'uploads');
console.log('Serving static files from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);

// Nested routes for sessions
app.use('/api/courses/:courseId/sessions', sessionRoutes);
app.use('/api/sessions/upcoming', sessionRoutes);

// Nested routes for materials
app.use('/api/courses/:courseId/materials', materialRoutes);

// Nested routes for reviews
app.use('/api/courses/:courseId/reviews', reviewRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('SkillBridge API is running...');
});

// Debug route to check file paths
app.get('/debug/paths', (req, res) => {
  const paths = {
    serverDir: __dirname,
    uploadsDir: path.join(__dirname, '..', 'uploads'),
    materialsDir: path.join(__dirname, '..', 'uploads', 'materials'),
    workingDir: process.cwd(),
    fileList: {
      uploads: fs.existsSync(path.join(__dirname, '..', 'uploads')) 
        ? fs.readdirSync(path.join(__dirname, '..', 'uploads')) 
        : 'Directory does not exist',
      materials: fs.existsSync(path.join(__dirname, '..', 'uploads', 'materials')) 
        ? fs.readdirSync(path.join(__dirname, '..', 'uploads', 'materials')) 
        : 'Directory does not exist'
    }
  };
  
  res.json(paths);
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  }); 