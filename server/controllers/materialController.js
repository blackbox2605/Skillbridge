const Material = require('../models/Material');
const Course = require('../models/Course');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Use absolute path for uploads directory
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'materials');
    console.log('Upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept all file types
  cb(null, true);
};

// Set up multer upload
exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
}).single('file');

// Upload a new material to a course
exports.uploadMaterial = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Verify user is the instructor of the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload materials to your own courses'
      });
    }
    
    // Extract file details
    const { title, description } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Log file details for debugging
    console.log('Uploaded file details:', {
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      destination: file.destination,
      size: file.size,
      mimetype: file.mimetype
    });
    
    // Create consistent file URL for storage and retrieval
    const fileUrl = `uploads/materials/${file.filename}`;
    
    // Create material record in database
    const newMaterial = await Material.create({
      title,
      description,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      course: courseId,
      uploadedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: {
        material: newMaterial
      }
    });
  } catch (error) {
    console.error('Error uploading material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while uploading material'
    });
  }
};

// Get all materials for a course
exports.getCourseMaterials = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // For non-instructors, verify they are enrolled in the course
    if (req.user.role !== 'instructor' || course.instructor.toString() !== req.user.id) {
      // Check enrollment - would need to adapt based on your enrollment model
      const isEnrolled = await checkEnrollment(req.user.id, courseId);
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access materials'
        });
      }
    }
    
    // Get materials for the course
    const materials = await Material.find({ course: courseId })
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: materials.length,
      data: {
        materials
      }
    });
  } catch (error) {
    console.error('Error getting course materials:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while getting materials'
    });
  }
};

// Check if a user is enrolled in a course
async function checkEnrollment(userId, courseId) {
  // You would need to implement this based on your enrollment model
  // Example assuming you have an Enrollment model
  const Enrollment = require('../models/Enrollment');
  const enrollment = await Enrollment.findOne({
    student: userId,
    course: courseId,
    status: 'active'
  });
  
  return enrollment !== null;
}

// Download a material
exports.downloadMaterial = async (req, res) => {
  try {
    const materialId = req.params.materialId;
    
    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Check if user is the instructor or enrolled in the course
    if (req.user.role !== 'instructor' || material.uploadedBy.toString() !== req.user.id) {
      const isEnrolled = await checkEnrollment(req.user.id, material.course);
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to download materials'
        });
      }
    }
    
    // Get file path information
    console.log('Material fileUrl:', material.fileUrl);
    
    // File path on server - joining with the root directory
    const filePath = path.join(__dirname, '..', '..', material.fileUrl);
    console.log('Attempting to download file from path:', filePath);
    
    // Verify file exists
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch (error) {
      console.error('File access error:', error);
      
      // Try an alternative path
      const alternatePath = path.join(process.cwd(), material.fileUrl);
      console.log('Trying alternate path:', alternatePath);
      
      try {
        await fs.promises.access(alternatePath, fs.constants.F_OK);
        // If we reach here, the alternate path exists
        console.log('Using alternate path instead');
        return sendFile(res, alternatePath, material);
      } catch (err) {
        console.error('Alternate path also failed:', err);
        return res.status(404).json({
          success: false,
          message: 'File not found at any possible location',
          details: {
            originalPath: filePath,
            alternatePath: alternatePath,
            fileUrl: material.fileUrl
          }
        });
      }
    }
    
    // If we get here, the original path exists
    return sendFile(res, filePath, material);
    
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while downloading material'
    });
  }
};

// Helper function to send the file
function sendFile(res, filePath, material) {
  // Set headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${material.fileName}"`);
  res.setHeader('Content-Type', material.fileType);
  
  // Stream file to response
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', (error) => {
    console.error('Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error streaming file'
      });
    }
  });
  
  fileStream.pipe(res);
  return true;
}

// Delete a material
exports.deleteMaterial = async (req, res) => {
  try {
    const materialId = req.params.materialId;
    
    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    // Verify user is the one who uploaded the material
    if (material.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete materials you uploaded'
      });
    }
    
    // Delete file from server
    const filePath = path.join(__dirname, '..', '..', material.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete material from database
    await material.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while deleting material'
    });
  }
}; 