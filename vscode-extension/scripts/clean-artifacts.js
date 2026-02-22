const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning build artifacts...');
console.log('='.repeat(60));

let removedCount = 0;
let removedSize = 0;

/**
 * Recursively delete a directory
 */
function deleteDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let size = 0;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      size += deleteDirectory(filePath);
    } else {
      size += stat.size;
      fs.unlinkSync(filePath);
      removedCount++;
    }
  });

  fs.rmdirSync(dirPath);
  return size;
}

/**
 * Delete a single file
 */
function deleteFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const stat = fs.statSync(filePath);
  const size = stat.size;
  fs.unlinkSync(filePath);
  removedCount++;
  return size;
}

/**
 * Delete files matching a pattern
 */
function deletePattern(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let size = 0;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (pattern.test(file)) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      size += stat.size;
      fs.unlinkSync(filePath);
      removedCount++;
      console.log(`  - Removed: ${file}`);
    }
  });

  return size;
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// =============================================================================
// Clean TypeScript Build Output
// =============================================================================
console.log('\n📦 Cleaning TypeScript output...');
const outDir = path.join(__dirname, '../out');
if (fs.existsSync(outDir)) {
  const size = deleteDirectory(outDir);
  removedSize += size;
  console.log(`  ✅ Removed 'out' directory (${formatBytes(size)})`);
} else {
  console.log('  ℹ️  No out directory to clean');
}

// =============================================================================
// Clean Coverage Reports
// =============================================================================
console.log('\n📊 Cleaning coverage reports...');
const coverageDir = path.join(__dirname, '../coverage');
if (fs.existsSync(coverageDir)) {
  const size = deleteDirectory(coverageDir);
  removedSize += size;
  console.log(`  ✅ Removed 'coverage' directory (${formatBytes(size)})`);
} else {
  console.log('  ℹ️  No coverage directory to clean');
}

const nycDir = path.join(__dirname, '../.nyc_output');
if (fs.existsSync(nycDir)) {
  const size = deleteDirectory(nycDir);
  removedSize += size;
  console.log(`  ✅ Removed '.nyc_output' directory (${formatBytes(size)})`);
} else {
  console.log('  ℹ️  No .nyc_output directory to clean');
}

// =============================================================================
// Clean Log Files
// =============================================================================
console.log('\n📝 Cleaning log files...');
const rootDir = path.join(__dirname, '..');
const logPattern = /\.(log|tmp|temp)$/i;
const logSize = deletePattern(rootDir, logPattern);
if (logSize > 0) {
  removedSize += logSize;
  console.log(`  ✅ Removed log files (${formatBytes(logSize)})`);
} else {
  console.log('  ℹ️  No log files to clean');
}

// =============================================================================
// Clean Node Profile Files
// =============================================================================
console.log('\n⚡ Cleaning profile files...');
const profilePattern = /^isolate-.*\.log$/;
const profileSize = deletePattern(rootDir, profilePattern);
if (profileSize > 0) {
  removedSize += profileSize;
  console.log(`  ✅ Removed profile files (${formatBytes(profileSize)})`);
} else {
  console.log('  ℹ️  No profile files to clean');
}

// =============================================================================
// Clean VSIX Packages (optional - keep latest)
// =============================================================================
console.log('\n📦 Checking VSIX packages...');
const vsixPattern = /\.vsix$/;
const vsixFiles = fs.readdirSync(rootDir).filter(f => vsixPattern.test(f));

if (vsixFiles.length > 1) {
  // Sort by modification time, keep newest
  const vsixWithStats = vsixFiles.map(file => ({
    name: file,
    path: path.join(rootDir, file),
    mtime: fs.statSync(path.join(rootDir, file)).mtime
  }));

  vsixWithStats.sort((a, b) => b.mtime - a.mtime);

  // Remove all except the newest
  let vsixSize = 0;
  for (let i = 1; i < vsixWithStats.length; i++) {
    const stat = fs.statSync(vsixWithStats[i].path);
    vsixSize += stat.size;
    fs.unlinkSync(vsixWithStats[i].path);
    removedCount++;
    console.log(`  - Removed old: ${vsixWithStats[i].name}`);
  }

  if (vsixSize > 0) {
    removedSize += vsixSize;
    console.log(`  ✅ Removed old VSIX packages (${formatBytes(vsixSize)})`);
    console.log(`  ℹ️  Kept: ${vsixWithStats[0].name}`);
  }
} else if (vsixFiles.length === 1) {
  console.log(`  ℹ️  Keeping current VSIX: ${vsixFiles[0]}`);
} else {
  console.log('  ℹ️  No VSIX packages found');
}

// =============================================================================
// Clean TypeScript Incremental Build Info
// =============================================================================
console.log('\n🔨 Cleaning TypeScript build info...');
const tsBuildInfo = path.join(__dirname, '../tsconfig.tsbuildinfo');
if (fs.existsSync(tsBuildInfo)) {
  const size = deleteFile(tsBuildInfo);
  removedSize += size;
  console.log(`  ✅ Removed tsconfig.tsbuildinfo (${formatBytes(size)})`);
} else {
  console.log('  ℹ️  No build info to clean');
}

const tsBuildInfoWebview = path.join(__dirname, '../tsconfig.webview.tsbuildinfo');
if (fs.existsSync(tsBuildInfoWebview)) {
  const size = deleteFile(tsBuildInfoWebview);
  removedSize += size;
  console.log(`  ✅ Removed tsconfig.webview.tsbuildinfo (${formatBytes(size)})`);
}

// =============================================================================
// Clean Test Artifacts
// =============================================================================
console.log('\n🧪 Cleaning test artifacts...');
const testArtifactPattern = /^test-.*\.(log|tmp)$/;
const testSize = deletePattern(rootDir, testArtifactPattern);
if (testSize > 0) {
  removedSize += testSize;
  console.log(`  ✅ Removed test artifacts (${formatBytes(testSize)})`);
} else {
  console.log('  ℹ️  No test artifacts to clean');
}

// =============================================================================
// Clean Security Reports (optional)
// =============================================================================
console.log('\n🔒 Cleaning old security reports...');
const securityReport = path.join(__dirname, '../security-report.md');
if (fs.existsSync(securityReport)) {
  const stat = fs.statSync(securityReport);
  const ageHours = (Date.now() - stat.mtime.getTime()) / 1000 / 60 / 60;

  if (ageHours > 24) {
    const size = deleteFile(securityReport);
    removedSize += size;
    console.log(`  ✅ Removed old security report (${formatBytes(size)})`);
  } else {
    console.log(`  ℹ️  Keeping recent security report (${Math.round(ageHours)} hours old)`);
  }
} else {
  console.log('  ℹ️  No security report to clean');
}

// =============================================================================
// Clean Temporary Directories
// =============================================================================
console.log('\n📁 Cleaning temporary directories...');
const tempDirs = ['.tmp', 'tmp', 'temp'];
tempDirs.forEach(dir => {
  const tempPath = path.join(rootDir, dir);
  if (fs.existsSync(tempPath)) {
    const size = deleteDirectory(tempPath);
    removedSize += size;
    console.log(`  ✅ Removed '${dir}' directory (${formatBytes(size)})`);
  }
});

// =============================================================================
// Summary
// =============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 Cleanup Summary');
console.log('='.repeat(60));
console.log(`Files removed: ${removedCount}`);
console.log(`Space freed: ${formatBytes(removedSize)}`);
console.log('='.repeat(60));

if (removedCount > 0) {
  console.log('\n✅ Cleanup complete!');
  console.log('\nNext steps:');
  console.log('  npm run compile    # Rebuild TypeScript');
  console.log('  npm run test       # Run tests');
} else {
  console.log('\n✅ Nothing to clean - already clean!');
}

console.log('\nTip: Run this before major rebuilds or when disk space is low.\n');

process.exit(0);
