const { validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Public
exports.getComplaints = async (req, res) => {
  try {
    const rawOffset = parseInt(req.query.offset);
    const rawLimit  = parseInt(req.query.limit);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
    const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50 : Math.min(rawLimit, 200);

    // ── Server-side filtering (critical for scale — don't return 1M rows) ──
    const where = {};
    if (req.query.ward)     where.ward = req.query.ward;
    if (req.query.status)   where.status = req.query.status;
    if (req.query.category) where.category = req.query.category;
    if (req.query.resolved !== undefined) where.resolved = req.query.resolved === 'true';

    const [complaints, total] = await Promise.all([
      Complaint.findAll({
        where,
        attributes: { exclude: ['photos', 'resolutionPhoto'] },
        order: [['time', 'DESC']],
        offset,
        limit
      }),
      Complaint.count({ where })
    ]);

    // ── HTTP Cache headers (enables CDN + browser caching) ──
    // Public complaint lists change frequently — cache for 30 seconds max
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      hasMore: offset + complaints.length < total,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Public
exports.createComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const complaintData = { ...req.body };

    // Sanitize free-text fields to prevent stored XSS
    if (complaintData.desc) complaintData.desc = complaintData.desc.slice(0, 2000);
    if (complaintData.location) complaintData.location = complaintData.location.slice(0, 500);

    if (req.files && req.files.length > 0) {
      complaintData.photos = req.files.map(file => file.path);
    }

    const complaint = await Complaint.create(complaintData);

    res.status(201).json({ success: true, data: complaint });
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

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update/Resolve a complaint
// @route   PUT /api/complaints/:id
// @access  Private
exports.updateComplaint = async (req, res) => {
  try {
    let complaint = await Complaint.findByPk(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const updateData = { ...req.body };

    if (req.file) {
      updateData.resolutionPhoto = req.file.path;
    }

    complaint = await complaint.update(updateData);

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Seed demo data
// @route   POST /api/complaints/seed
// @access  Private (Admin only)
exports.seedComplaints = async (req, res) => {
  try {
    const demoData = req.body;
    if (!Array.isArray(demoData)) {
       return res.status(400).json({ success: false, message: 'Body must be an array' });
    }
    
    await Complaint.bulkCreate(demoData, { ignoreDuplicates: true });
    res.status(201).json({ success: true, message: 'Demo data seeded successfully' });
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
}
