#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcPath = path.join(__dirname, '../src');
let isBuilding = false;
let pendingRebuild = false;

console.log('🔍 Watching src/ folder for changes...');
console.log('📱 Will auto-rebuild: Website + Customer APK + Driver APK\n');

const buildAll = () => {
  if (isBuilding) {
    pendingRebuild = true;
    return;
  }

  isBuilding = true;
  pendingRebuild = false;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n⏱️  [${timestamp}] Change detected! Rebuilding...\n`);

  exec('npm run build && npm run build:customer && npm run build:driver', (err, stdout, stderr) => {
    isBuilding = false;

    if (err) {
      console.error('❌ Build failed:', err.message);
      console.error(stderr);
    } else {
      console.log('✅ All versions built successfully!');
      console.log('   - dist/ (Website)');
      console.log('   - dist-customer/ (Customer APK)');
      console.log('   - dist-driver/ (Driver APK)\n');
      console.log('⏳ Watching for more changes...\n');
    }

    if (pendingRebuild) buildAll();
  });
};

// Watch src folder recursively
fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('node_modules')) {
    buildAll();
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Watch stopped');
  process.exit(0);
});
