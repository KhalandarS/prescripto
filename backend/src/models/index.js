const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING },
  role: { type: DataTypes.ENUM('doctor', 'patient', 'admin', 'pharmacist'), defaultValue: 'patient' },
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  medical_license_number: DataTypes.STRING,
  specialization: DataTypes.STRING,
});

const Session = sequelize.define('Session', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  status: { type: DataTypes.ENUM('active', 'stopped', 'processing', 'completed', 'failed'), defaultValue: 'active' },
  started_at: DataTypes.DATE,
  duration_seconds: DataTypes.INTEGER,
  audio_url: DataTypes.STRING,
});

const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  patient_name: { type: DataTypes.STRING, allowNull: false },
  diagnosis: { type: DataTypes.TEXT, allowNull: false },
  symptoms: DataTypes.TEXT,
  additional_notes: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('draft', 'finalized', 'dispensed', 'cancelled'), defaultValue: 'draft' },
  ai_extraction_confidence: DataTypes.FLOAT,
  
  // Clinical Review Fields
  clinical_summary: DataTypes.TEXT,
  pharmacological_notes: DataTypes.TEXT,
  is_validated: { type: DataTypes.BOOLEAN, defaultValue: false },
  doctor_signature: DataTypes.TEXT, // Store as base64 or digital hash
  signed_at: DataTypes.DATE
});

const Medication = sequelize.define('Medication', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  medication_name: DataTypes.STRING,
  dosage: DataTypes.STRING,
  frequency: DataTypes.STRING,
  duration_days: DataTypes.INTEGER,
  instructions: DataTypes.TEXT,
  quantity: DataTypes.INTEGER,
});

// Relationships
User.hasMany(Session, { as: 'doctor_sessions', foreignKey: 'doctor_id' });
User.hasMany(Session, { as: 'patient_sessions', foreignKey: 'patient_id' });
User.hasMany(Prescription, { as: 'doctor_prescriptions', foreignKey: 'doctor_id' });
User.hasMany(Prescription, { as: 'patient_prescriptions', foreignKey: 'patient_id' });
Session.hasOne(Prescription, { foreignKey: 'session_id' });
Prescription.hasMany(Medication, { foreignKey: 'prescription_id' });
Medication.belongsTo(Prescription, { foreignKey: 'prescription_id' });

module.exports = { User, Session, Prescription, Medication, sequelize };
