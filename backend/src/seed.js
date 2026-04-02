const { User, Prescription, Medication, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
  await sequelize.sync({ alter: true }); // Update schema with new fields

  try {
    // 1. Create a Doctor and a Pharmacist for testing
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const [doctor] = await User.findOrCreate({
      where: { email: 'doctor@test.com' },
      defaults: {
        password_hash: hashedPassword,
        role: 'doctor',
        first_name: 'Sarah',
        last_name: 'Smith',
        medical_license_number: 'MD12345'
      }
    });

    const [pharmacist] = await User.findOrCreate({
      where: { email: 'pharma@test.com' },
      defaults: {
        password_hash: hashedPassword,
        role: 'pharmacist',
        first_name: 'James',
        last_name: 'Wilson'
      }
    });

    console.log('Test Users Created: doctor@test.com / pharma@test.com (password: password123)');

    // 2. Create some sample prescriptions
    const samplePrescriptions = [
      {
        patient_name: 'John Doe',
        diagnosis: 'Acute Bronchitis',
        symptoms: 'Persistent cough, chest congestion',
        status: 'draft', // Pending for pharmacy
        medications: [
          { medication_name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration_days: 7, instructions: 'Take after meals' },
          { medication_name: 'Cough Syrup', dosage: '10ml', frequency: 'Every 6 hours', duration_days: 5, instructions: 'Shake well before use' }
        ]
      },
      {
        patient_name: 'Alice Smith',
        diagnosis: 'Hypertension',
        symptoms: 'High blood pressure, occasional headaches',
        status: 'draft', // Pending for pharmacy
        medications: [
          { medication_name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration_days: 30, instructions: 'Take in the morning' }
        ]
      },
      {
        patient_name: 'Bob Johnson',
        diagnosis: 'Seasonal Allergies',
        symptoms: 'Sneezing, itchy eyes',
        status: 'dispensed', // Already delivered
        medications: [
          { medication_name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration_days: 14, instructions: 'May cause drowsiness' }
        ]
      }
    ];

    for (const data of samplePrescriptions) {
      const { medications, ...rxData } = data;
      const rx = await Prescription.create({
        ...rxData,
        doctor_id: doctor.id
      });

      for (const med of medications) {
        await Medication.create({
          ...med,
          prescription_id: rx.id
        });
      }
    }

    console.log('Sample Prescriptions Seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
