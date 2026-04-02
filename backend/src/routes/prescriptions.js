const express = require('express');
const router = express.Router();
const { generatePrescription } = require('../services/prescription.service');
const { Prescription, Medication } = require('../models');
const { Op } = require('sequelize');

// POST /api/prescriptions/generate
router.post('/generate', async (req, res) => {
  try {
    const { sessionId, patientId, patientName, doctorId, transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const result = await generatePrescription(sessionId, patientId, patientName, doctorId, transcript);
    res.json({ status: 'success', ...result });
  } catch (err) {
    console.error('Error generating rx:', err);
    res.status(500).json({ error: 'Failed to generate prescription' });
  }
});

// POST /api/prescriptions/:id/finalize (Doctor Sign-off/Manual Overrides)
router.post('/:id/finalize', async (req, res) => {
  try {
    const { modifiedMedications } = req.body;
    
    // Sync Manual Modifications (If any)
    if (modifiedMedications && Array.isArray(modifiedMedications)) {
      await Medication.destroy({ where: { prescription_id: req.params.id } });
      for (const med of modifiedMedications) {
        await Medication.create({
          ...med,
          prescription_id: req.params.id
        });
      }
    }

    const rx = await Prescription.findByPk(req.params.id, { include: [Medication] });
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });
    
    rx.status = 'finalized';
    await rx.save();

    res.json({ message: 'Prescription finalized and saved', prescription: rx });
  } catch (err) {
    console.error('Finalization failed:', err);
    res.status(500).json({ error: 'Failed to finalize prescription' });
  }
});

// GET /api/prescriptions/:id
router.get('/:id', async (req, res) => {
  try {
    const rx = await Prescription.findByPk(req.params.id, { include: [Medication] });
    if (!rx) return res.status(404).json({ error: 'Not found' });
    res.json(rx);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
