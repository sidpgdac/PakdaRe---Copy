const express = require('express');
const router = express.Router();
const {
  getComplaints,
  createComplaint,
  getComplaint,
  updateComplaint,
  seedComplaints
} = require('../controllers/complaintController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (or modify to be protected if citizens must log in)
router.route('/')
  .get(getComplaints)
  .post(createComplaint); // e.g. citizens adding complaints

router.post('/seed', protect, authorize('admin'), seedComplaints);

router.route('/:id')
  .get(getComplaint)
  .put(updateComplaint); // Currently unprotected for easy dev, consider adding `protect` here

module.exports = router;
