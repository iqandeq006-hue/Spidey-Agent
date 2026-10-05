#!/usr/bin/env node

/**
 * SpideyAgent Model Verification & Setup Script
 * Ensures all required on-device ONNX models exist before building or running.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../extension/public/models');

const REQUIRED_MODELS = [
  { name: 'blazeface.onnx', minSize: 500000, desc: 'BlazeFace Facial Biometrics' },
  { name: 'ocr-det.onnx', minSize: 4000000, desc: 'DBNet Neural Text Detection' },
  { name: 'yolos_tiny_q4.onnx', minSize: 7000000, desc: 'YOLOS Vision Transformer (ViT)' },
  { 
    name: 'omniparser_icon_detect.onnx', 
    minSize: 50000000, 
    desc: 'Microsoft OmniParser v2.0 UI Icon Detector',
    generator: 'scripts/export_omniparser.py'
  }
];

console.log('='.repeat(65));
console.log(' SpideyAgent On-Device Neural Vision Model Verifier');
console.log('='.repeat(65));
console.log(`Checking models directory: ${MODELS_DIR}\n`);

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

let missingModels = [];

for (const model of REQUIRED_MODELS) {
  const filePath = path.join(MODELS_DIR, model.name);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size >= model.minSize) {
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  [OK] ${model.name.padEnd(30)} (${sizeMb} MB) — ${model.desc}`);
    } else {
      console.log(`  [WARN] ${model.name} exists but file is truncated (${stats.size} bytes).`);
      missingModels.push(model);
    }
  } else {
    console.log(`  [MISSING] ${model.name.padEnd(28)} — ${model.desc}`);
    missingModels.push(model);
  }
}

if (missingModels.length === 0) {
  console.log('\n✔ All on-device vision models verified successfully! Ready to build.');
  process.exit(0);
}

console.log('\n' + '-'.repeat(65));
console.log(`⚠️  ${missingModels.length} model(s) need setup.`);

const omniMissing = missingModels.find(m => m.name === 'omniparser_icon_detect.onnx');
if (omniMissing) {
  console.log('\nAttempting automatic generation for Microsoft OmniParser v2.0 via Python...');
  const pythonScript = path.resolve(__dirname, 'export_omniparser.py');

  const py = spawn('python', [pythonScript], { stdio: 'inherit', shell: true });
  py.on('close', (code) => {
    if (code === 0) {
      console.log('\n✔ OmniParser exported successfully! Models ready.');
      process.exit(0);
    } else {
      console.log('\n[INFO] To generate OmniParser manually, run:');
      console.log('  1. pip install -r scripts/requirements-models.txt');
      console.log('  2. python scripts/export_omniparser.py\n');
      console.log('Note: SpideyAgent includes built-in heuristic fallbacks if OmniParser ONNX is absent.');
      process.exit(0);
    }
  });
} else {
  process.exit(0);
}
