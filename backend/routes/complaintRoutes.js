const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getComplaints,
  createComplaint,
  getComplaint,
  updateComplaint,
  seedComplaints
} = require('../controllers/complaintController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const validateComplaint = [
  body('ward').notEmpty(),
  body('lat').isNumeric(),
  body('lng').isNumeric(),
  body('category').notEmpty(),
];

// Public routes
router.route('/')
  .get(getComplaints)
  .post(upload.array('photos', 5), validateComplaint, createComplaint); 

router.post('/seed', protect, authorize('admin'), seedComplaints);

router.route('/:id')
  .get(getComplaint)
  .put(upload.single('resolutionPhoto'), updateComplaint); 

module.exports = router;
