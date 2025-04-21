const express = require('express');
const router = express.Router({ mergeParams: true }); // To access parent route parameters
const materialController = require('../controllers/materialController');
const { protect, protectDownload } = require('../middleware/auth');

// Get all materials for a course
router.get('/', protect, materialController.getCourseMaterials);

// Upload a new material
router.post('/', protect, materialController.upload, materialController.uploadMaterial);

// Download a material
router.get('/:materialId/download', protectDownload, materialController.downloadMaterial);

// Delete a material
router.delete('/:materialId', protect, materialController.deleteMaterial);

module.exports = router; 