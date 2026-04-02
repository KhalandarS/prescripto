const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// AGENT 1: Extraction Specialist
async function extractPrescription(transcript) {
  const prompt = `
You are a medical AI assistant. Extract prescription information from this clinical conversation transcript.

TRANSCRIPT:
${transcript}

Extract and return ONLY JSON with this structure:
{
  "diagnosis": "Primary diagnosis",
  "symptoms": "List of symptoms mentioned",
  "medications": [
    {
      "medicationName": "Drug name",
      "dosage": "Strength (e.g., 250mg)",
      "frequency": "once_daily|twice_daily|three_times_daily|four_times_daily|as_needed",
      "durationDays": number,
      "instructions": "Special instructions",
      "routeOfAdministration": "oral|topical|injection",
      "quantity": number,
      "quantityUnit": "tablets|capsules|ml"
    }
  ],
  "additionalNotes": "Any other relevant notes"
}
`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

// AGENT 2: Clinical Reviewer
async function summarizeClinicalSession(transcript, extractedData) {
  const prompt = `
You are a senior clinical reviewer. Review this clinical transcript and the initial AI extraction.
TRANSCRIPT: ${transcript}
EXTRACTED: ${JSON.stringify(extractedData)}

Generate a professional clinical summary for the patient's record. Include:
1. Chief Complaint
2. Clinical Observations
3. Assessment
4. Plan and Follow-up

Return as a concise string of clinical notes.
`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// AGENT 3: Pharmacological Validator
async function validateMedications(medications, diagnosis) {
  const prompt = `
You are an AI Pharmacologist. Review these extracted medications for a patient diagnosed with: ${diagnosis}.
MEDICATIONS: ${JSON.stringify(medications)}

1. Check for standard dosage alignment with the diagnosis.
2. Flag any immediate concerns or missing duration data.
3. suggest a brief 'pharmacological validity note' for the doctor's review.

Return JSON:
{
  "isValidated": boolean,
  "pharmacologicalNotes": "Brief expert note",
  "concerns": ["list of concerns if any"]
}
`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

module.exports = { extractPrescription, summarizeClinicalSession, validateMedications };
