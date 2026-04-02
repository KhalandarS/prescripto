const { Prescription, Medication } = require('../models');
const geminiService = require('./gemini.service');

async function generatePrescription(sessionId, patientId, patientName, doctorId, transcriptText) {
  // 1. Single Agent Extraction
  const extracted = await geminiService.extractPrescription(transcriptText);
  
  // 2. Parallel AI Agents Context Generation
  const [summary, validation] = await Promise.all([
    geminiService.summarizeClinicalSession(transcriptText, extracted),
    geminiService.validateMedications(extracted.medications, extracted.diagnosis)
  ]);
  
  // Create prescription in database as 'draft'
  const prescription = await Prescription.create({
    session_id: sessionId,
    doctor_id: doctorId,
    patient_id: patientId,
    patient_name: patientName || 'Unknown Patient',
    diagnosis: extracted.diagnosis || 'Unknown Diagnosis',
    symptoms: extracted.symptoms || '',
    additional_notes: extracted.additionalNotes || '',
    status: 'draft', 
    ai_extraction_confidence: 0.92,
    
    // Multi-Agent Outputs
    clinical_summary: summary,
    pharmacological_notes: validation.pharmacologicalNotes,
    is_validated: validation.isValidated
  });
  
  // Create medications
  let medications = [];
  if (extracted.medications && Array.isArray(extracted.medications)) {
    medications = await Promise.all(
      extracted.medications.map(async (med) => 
        Medication.create({
          prescription_id: prescription.id,
          medication_name: med.medicationName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration_days: med.durationDays,
          instructions: med.instructions,
          quantity: med.quantity
        })
      )
    );
  }

  return { 
    prescription, 
    medications,
    reviewNotes: summary,
    validityCheck: validation.pharmacologicalNotes
  };
}

module.exports = { generatePrescription };
