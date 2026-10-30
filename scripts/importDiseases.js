// DPDRS Backend - Import Diseases Dataset (Batch Processing)
// Handles large CSV files without memory issues

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const DATASET_DIR = path.join(__dirname, '../../dataset');
const BATCH_SIZE = 500; // Insert 500 diseases at a time

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

// Stream-Read large CSV file line by line
async function readLargeCSV(filename) {
  const filePath = path.join(DATASET_DIR, filename);
  console.log(`📖 Streaming: ${filename}`);

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  const rows = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = parseCSVLine(line);
      continue;
    }
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    rows.push(row);
  }

  console.log(`   ✅ ${rows.length} rows loaded`);
  return { headers, rows };
}

// Read small CSV (regular fs)
function readCSV(filename) {
  const filePath = path.join(DATASET_DIR, filename);
  console.log(`📖 Reading: ${filename}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  console.log(`   ✅ ${rows.length} rows loaded`);
  return { headers, rows };
}

// Normalize disease name
const normalize = (name) => (name || '').toLowerCase().trim();

// Main import
async function importDiseases() {
  try {
    console.log('\n════════════════════════════════════════');
    console.log('🚀 DPDRS Disease Import (SympScan Dataset)');
    console.log('════════════════════════════════════════\n');

    await connectDB();
    console.log('');

    // ── Step 1: Stream-read the large symptoms dataset ──
    const { headers: symptomHeaders, rows: symptomRows } =
      await readLargeCSV('Diseases_and_Symptoms_dataset.csv');

    const symptomColumns = symptomHeaders.slice(1);
    console.log(`   📊 ${symptomColumns.length} symptom columns\n`);

    // ── Step 2: Aggregate symptoms per disease ──
    console.log('🔍 Aggregating symptoms by disease...');
    const diseaseSymptomsMap = new Map();

    for (const row of symptomRows) {
      const disease = row['diseases'] || row['disease'];
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

    // ── Step 3: Read supporting CSVs ──
    const { rows: descriptionRows } = readCSV('description.csv');
    const { rows: precautionRows } = readCSV('precautions.csv');
    const { rows: medicationRows } = readCSV('medications.csv');
    const { rows: dietRows } = readCSV('diets.csv');
    const { rows: workoutRows } = readCSV('workout.csv');

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

    // ── Step 4: Build disease documents ──
    console.log('📦 Building disease documents...');
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
      });
    }
    console.log(`✅ Built ${diseases.length} disease documents\n`);

    // ── Step 5: Insert in batches ──
    const Disease = require('../models/Disease');

    console.log('🗑️  Clearing existing diseases...');
    const del = await Disease.deleteMany({});
    console.log(`   Deleted: ${del.deletedCount} old records\n`);

    console.log(`💾 Inserting in batches of ${BATCH_SIZE}...`);
    let inserted = 0;
    for (let i = 0; i < diseases.length; i += BATCH_SIZE) {
      const batch = diseases.slice(i, i + BATCH_SIZE);
      const result = await Disease.insertMany(batch, { ordered: false });
      inserted += result.length;
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.length} inserted`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('🎉 IMPORT COMPLETE');
    console.log('════════════════════════════════════════');
    console.log(`📊 Total diseases: ${inserted}`);
    console.log(`📊 Sample: ${diseases[0].diseaseName}`);
    console.log('════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ IMPORT FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

importDiseases();