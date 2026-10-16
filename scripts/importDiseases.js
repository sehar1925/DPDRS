// DPDRS Backend - Import Diseases Dataset
// Reads 6 CSV files from dataset/ folder and imports into diseases collection

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const DATASET_DIR = path.join(__dirname, '../../dataset');

// Helper: Normalize disease name
const normalize = (name) => (name || '').toLowerCase().trim();

// Simple CSV Parser
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Read CSV file
function readCSV(filename) {
  const filePath = path.join(DATASET_DIR, filename);
  console.log(`📖 Reading: ${filename}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  console.log(`   ✅ ${rows.length} rows loaded`);
  return { headers, rows };
}

// Main import
async function importDiseases() {
  try {
    console.log('\n════════════════════════════════════════');
    console.log('🚀 DPDRS Disease Import Script');
    console.log('════════════════════════════════════════\n');

    await connectDB();
    console.log('');

    // Read symptoms dataset
    const { headers: symptomHeaders, rows: symptomRows } =
      readCSV('Diseases_and_Symptoms_dataset.csv');

    const symptomColumns = symptomHeaders.slice(1);
    console.log(`   📊 ${symptomColumns.length} symptom columns\n`);

    // Aggregate symptoms by disease
    console.log('🔍 Aggregating symptoms by disease...');
    const diseaseSymptomsMap = new Map();

    for (const row of symptomRows) {
      const disease = row['diseases'];
      if (!disease) continue;

      if (!diseaseSymptomsMap.has(disease)) {
        diseaseSymptomsMap.set(disease, new Set());
      }

      const symptomSet = diseaseSymptomsMap.get(disease);
      for (const symptom of symptomColumns) {
        if (row[symptom] === '1') {
          symptomSet.add(symptom);
        }
      }
    }

    console.log(`   ✅ Found ${diseaseSymptomsMap.size} unique diseases\n`);

    // Read supporting CSVs
    const { rows: descriptionRows } = readCSV('description.csv');
    const { rows: precautionRows } = readCSV('precautions.csv');
    const { rows: medicationRows } = readCSV('medications.csv');
    const { rows: dietRows } = readCSV('diets.csv');
    const { rows: workoutRows } = readCSV('workout.csv');

    // Maps (case-insensitive)
    const descriptionMap = new Map(
      descriptionRows.map((r) => [normalize(r['Disease']), r['Description']])
    );
    const precautionMap = new Map(
      precautionRows.map((r) => [
        normalize(r['Disease']),
        [r['Precaution_1'], r['Precaution_2'], r['Precaution_3'], r['Precaution_4']].filter(Boolean),
      ])
    );
    const medicationMap = new Map(
      medicationRows.map((r) => [normalize(r['Disease']), r['Medication']])
    );
    const dietMap = new Map(dietRows.map((r) => [normalize(r['Disease']), r['Diet']]));
    const workoutMap = new Map(workoutRows.map((r) => [normalize(r['Disease']), r['Workouts']]));

    console.log('\n════════════════════════════════════════');
    console.log('📦 Building disease documents...');
    console.log('════════════════════════════════════════\n');

    const diseases = [];

    for (const [diseaseName, symptomSet] of diseaseSymptomsMap) {
      const normalizedName = normalize(diseaseName);
      const symptomCount = symptomSet.size;

      let severity = 'mild';
      if (symptomCount > 15) severity = 'severe';
      else if (symptomCount > 8) severity = 'moderate';

      const medications = medicationMap.get(normalizedName) || '';
      const diet = dietMap.get(normalizedName) || '';
      const workouts = workoutMap.get(normalizedName) || '';

      const treatmentParts = [];
      if (medications) treatmentParts.push(`Medications: ${medications}`);
      if (diet) treatmentParts.push(`Diet: ${diet}`);
      if (workouts) treatmentParts.push(`Workouts: ${workouts}`);

      diseases.push({
        diseaseName: diseaseName.trim(),
        symptoms: Array.from(symptomSet),
        precautions: precautionMap.get(normalizedName) || [],
        severity,
        treatmentGuidelines: treatmentParts.join(' | ') || 'Consult a doctor for treatment.',
        description: descriptionMap.get(normalizedName) || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`✅ Built ${diseases.length} disease documents\n`);

    // Import
    const Disease = require('../models/Disease');

    console.log('🗑️  Clearing existing diseases...');
    const deleteResult = await Disease.deleteMany({});
    console.log(`   Deleted: ${deleteResult.deletedCount} old records\n`);

    console.log('💾 Inserting new diseases...');
    const insertResult = await Disease.insertMany(diseases, { ordered: false });
    console.log(`   ✅ Inserted: ${insertResult.length} diseases\n`);

    // Summary
    console.log('════════════════════════════════════════');
    console.log('🎉 IMPORT COMPLETE');
    console.log('════════════════════════════════════════');
    console.log(`📊 Total diseases: ${insertResult.length}`);
    console.log(`📊 Sample disease: ${diseases[0].diseaseName}`);
    console.log(`📊 With description: ${diseases.filter((d) => d.description).length}`);
    console.log(`📊 With precautions: ${diseases.filter((d) => d.precautions.length > 0).length}`);
    console.log(`📊 With treatment: ${diseases.filter((d) => d.treatmentGuidelines.length > 50).length}`);
    console.log('════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ IMPORT FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importDiseases();