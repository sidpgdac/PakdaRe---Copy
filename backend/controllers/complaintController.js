const Complaint = require('../models/Complaint');

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Public (or Private depending on your needs)
exports.getComplaints = async (req, res) => {
  try {
    const { offset = 0, limit = 50 } = req.query;
    
    // Fetch complaints ordered by newest first
    const complaints = await Complaint.findAll({
      order: [['time', 'DESC']],
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Private (or Public if citizens don't need to login)
exports.createComplaint = async (req, res) => {
  try {
    // req.body should contain all the complaint fields (id, ward, lat, lng, etc.)
    const complaint = await Complaint.create(req.body);

    res.status(201).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get a single complaint by ID
// @route   GET /api/complaints/:id
// @access  Public
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update/Resolve a complaint
// @route   PUT /api/complaints/:id
// @access  Private (Staff/Officer only)
exports.updateComplaint = async (req, res) => {
  try {
    let complaint = await Complaint.findByPk(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Update the record
    complaint = await complaint.update(req.body);

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Seed demo data (Optional utility)
// @route   POST /api/complaints/seed
// @access  Private (Admin only)
exports.seedComplaints = async (req, res) => {
  try {
    const demoData = req.body; // Array of complaints
    if (!Array.isArray(demoData)) {
       return res.status(400).json({ success: false, message: 'Body must be an array' });
    }
    
    // bulkCreate is much faster for inserting arrays
    await Complaint.bulkCreate(demoData, { ignoreDuplicates: true });
    
    res.status(201).json({ success: true, message: 'Demo data seeded successfully' });
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
}
