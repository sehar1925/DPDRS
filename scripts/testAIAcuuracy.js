// DPDRS Backend - AI Accuracy Test Script
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Disease = require('../models/Disease');
const { predictDisease } = require('../utils/geminiClient');

const DATASET_DIR = path.join(__dirname, '../../dataset');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else { current += char; }
  }
  result.push(current.trim());
  return result;
}

async function runTest() {
  await connectDB();
  console.log('\n📖 Loading Dataset...');
  
  const content = fs.readFileSync(path.join(DATASET_DIR, 'Diseases_and_Symptoms_dataset.csv'), 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  const headers = parseCSVLine(lines[0]);
  const symptomCols = headers.slice(1);

  const testCases = [];
  // 10 random cases uthayen
  for (let i = 1; i <= 10; i++) {
    const randomRow = lines[Math.floor(Math.random() * lines.length)];
    const values = parseCSVLine(randomRow);
    const actualDisease = values[0];
    const symptoms = [];
    symptomCols.forEach((col, idx) => {
      if (values[idx + 1] === '1') symptoms.push(col.replace(/_/g, ' '));
    });
    if (symptoms.length > 0) {
      testCases.push({ actualDisease, symptoms });
    }
  }

  const diseasesRef = await Disease.find({}).lean();
  console.log(`\n🧠 Testing AI on ${testCases.length} random cases from Dataset...\n`);
  let correct = 0;

  for (let i = 0; i < testCases.length; i++) {
    const { actualDisease, symptoms } = testCases[i];
    console.log(`Test ${i + 1}: Actual Disease: [${actualDisease.toUpperCase()}]`);
    console.log(`   Symptoms: ${symptoms.slice(0, 5).join(', ')}...`);

    try {
      const result = await predictDisease(symptoms, diseasesRef);
      const aiTop = result.predictedDiseases[0].diseaseName;
      
      const isMatch = aiTop.toLowerCase().includes(actualDisease.toLowerCase()) || 
                      actualDisease.toLowerCase().includes(aiTop.toLowerCase());

      if (isMatch) {
        console.log(`   ✅ AI Prediction: [${aiTop}] (MATCH!) - Confidence: ${result.predictedDiseases[0].confidence}\n`);
        correct++;
      } else {
        console.log(`   ❌ AI Prediction: [${aiTop}] (MISMATCH) - Confidence: ${result.predictedDiseases[0].confidence}\n`);
      }
    } catch (error) {
      console.log(`   ⚠️ API Error: ${error.message}\n`);
    }
    // API rate limit se bachne ke liye 3 sec wait
    await new Promise(r => setTimeout(r, 3000)); 
  }

  console.log(`\n📊 FINAL RESULT: ${correct}/${testCases.length} Cases Matched`);
  console.log(`🎯 AI Accuracy: ${(correct/testCases.length * 100).toFixed(1)}%`);
  process.exit(0);
}

runTest();