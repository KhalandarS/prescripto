const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractPrescription(transcript) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const prompt = `
You are a medical AI assistant. Extract prescription information from this clinical conversation transcript.

TRANSCRIPT:
${transcript}

Extract and return ONLY valid JSON (no markdown, no explanation) with this exact structure:
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

Rules:
- Only extract information explicitly mentioned
- Use standard medical terminology
- If dosage unclear, use null
- If duration not specified, estimate based on condition
- Ensure frequency matches enum values exactly
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Remove markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini error:', err);
    throw err;
  }
}

module.exports = { extractPrescription };
