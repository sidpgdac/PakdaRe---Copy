const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.STRING, // Using STRING to match potential existing Supabase IDs or UUIDs
    primaryKey: true
  },
  ward: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lat: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  lng: {
    type: DataTypes.DOUBLE,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  severity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  desc: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending'
  },
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDemo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  photos: {
    type: DataTypes.JSON, // Storing as JSON array of URLs
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolutionOfficer: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resolutionGps: {
    type: DataTypes.JSON, // { lat, lng }
    allowNull: true
  },
  gpsVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolutionPhoto: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = Complaint;
