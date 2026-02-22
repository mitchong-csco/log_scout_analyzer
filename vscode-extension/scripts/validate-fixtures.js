const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '../src/test/fixtures');

console.log('🔍 Validating test fixtures...');
console.log('='.repeat(60));
console.log(`Fixtures directory: ${FIXTURES_DIR}\n`);

let errors = 0;
let warnings = 0;
let validated = 0;

// Check fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  console.log('ℹ️  Fixtures directory not found. Creating structure...\n');

  // Create fixtures directory structure
  const dirs = [
    FIXTURES_DIR,
    path.join(FIXTURES_DIR, 'archives'),
    path.join(FIXTURES_DIR, 'logs'),
    path.join(FIXTURES_DIR, 'configs')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Created: ${path.relative(process.cwd(), dir)}`);
    }
  });

  console.log('\n✅ Fixture structure created!');
  console.log('   Add test fixtures to the directories above.');
  process.exit(0);
}

// Validate archives
console.log('📦 Checking archive fixtures...');
const archivesDir = path.join(FIXTURES_DIR, 'archives');
if (fs.existsSync(archivesDir)) {
  const archives = fs.readdirSync(archivesDir).filter(f => !f.startsWith('.'));

  if (archives.length === 0) {
    console.log('  ⚠️  No archive fixtures found');
    warnings++;
  } else {
    archives.forEach(file => {
      const filePath = path.join(archivesDir, file);
      const stats = fs.statSync(filePath);
      validated++;

      // Check file size expectations based on filename
      if (file.includes('small') && stats.size > 100 * 1024) {
        console.log(`  ❌ ${file}: Too large for "small" fixture (${formatBytes(stats.size)})`);
        console.log(`     Expected: < 100 KB, Got: ${formatBytes(stats.size)}`);
        errors++;
      } else if (file.includes('large') && stats.size < 1024 * 1024) {
        console.log(`  ⚠️  ${file}: Small for "large" fixture (${formatBytes(stats.size)})`);
        console.log(`     Expected: > 1 MB, Got: ${formatBytes(stats.size)}`);
        warnings++;
      } else if (stats.size === 0) {
        console.log(`  ❌ ${file}: Empty file`);
        errors++;
      } else {
        console.log(`  ✅ ${file} (${formatBytes(stats.size)})`);
      }

      // Check file extension
      const validExtensions = ['.zip', '.tar', '.gz', '.tgz', '.7z'];
      const ext = path.extname(file);
      if (!validExtensions.includes(ext) && !file.includes('corrupted')) {
        console.log(`  ⚠️  ${file}: Unusual extension for archive`);
        warnings++;
      }
    });
  }
} else {
  console.log('  ⚠️  Archives directory not found');
  warnings++;
}

console.log();

// Validate logs
console.log('📄 Checking log fixtures...');
const logsDir = path.join(FIXTURES_DIR, 'logs');
if (fs.existsSync(logsDir)) {
  const logs = fs.readdirSync(logsDir).filter(f => !f.startsWith('.'));

  if (logs.length === 0) {
    console.log('  ⚠️  No log fixtures found');
    warnings++;
  } else {
    logs.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      validated++;

      if (stats.size === 0) {
        console.log(`  ❌ ${file}: Empty file`);
        errors++;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;

        // Basic content validation
        let hasLogPatterns = false;
        const logPatterns = [
          /\d{4}-\d{2}-\d{2}/,  // Date
          /ERROR|WARN|INFO|DEBUG/i,  // Log levels
          /\[.*\]/  // Bracketed content
        ];

        hasLogPatterns = logPatterns.some(pattern => pattern.test(content));

        if (!hasLogPatterns && !file.includes('empty') && !file.includes('invalid')) {
          console.log(`  ⚠️  ${file}: Doesn't look like a log file`);
          warnings++;
        }

        console.log(`  ✅ ${file} (${lines} lines, ${formatBytes(stats.size)})`);
      }
    });
  }
} else {
  console.log('  ⚠️  Logs directory not found');
  warnings++;
}

console.log();

// Validate configs
console.log('⚙️  Checking config fixtures...');
const configsDir = path.join(FIXTURES_DIR, 'configs');
if (fs.existsSync(configsDir)) {
  const configs = fs.readdirSync(configsDir).filter(f => !f.startsWith('.'));

  if (configs.length === 0) {
    console.log('  ⚠️  No config fixtures found');
    warnings++;
  } else {
    configs.forEach(file => {
      const filePath = path.join(configsDir, file);
      const stats = fs.statSync(filePath);
      validated++;

      if (stats.size === 0) {
        console.log(`  ❌ ${file}: Empty file`);
        errors++;
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Validate JSON files
      if (file.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          console.log(`  ✅ ${file} (valid JSON, ${Object.keys(parsed).length} keys)`);
        } catch (e) {
          console.log(`  ❌ ${file}: Invalid JSON`);
          console.log(`     Error: ${e.message}`);
          errors++;
        }
      }
      // Validate YAML files
      else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        // Basic YAML validation (check for key-value pairs)
        if (content.includes(':') || content.includes('-')) {
          console.log(`  ✅ ${file} (appears to be valid YAML)`);
        } else {
          console.log(`  ⚠️  ${file}: Doesn't look like valid YAML`);
          warnings++;
        }
      } else {
        console.log(`  ✅ ${file} (${formatBytes(stats.size)})`);
      }
    });
  }
} else {
  console.log('  ⚠️  Configs directory not found');
  warnings++;
}

console.log();

// Summary
console.log('='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`Fixtures validated: ${validated}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);
console.log();

if (errors === 0 && warnings === 0) {
  console.log('✅ All fixtures valid! Perfect!');
  process.exit(0);
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s) found, but no errors.`);
  console.log('   Consider addressing warnings for better test data quality.');
  process.exit(0);
} else {
  console.log(`❌ ${errors} error(s) found!`);
  console.log('   Fix errors before running tests.');
  console.log();
  console.log('TIPS:');
  console.log('  - Use npm run test:generate-fixtures to create sample fixtures');
  console.log('  - Ensure fixture names match their content (e.g., "small-*.zip")');
  console.log('  - Validate JSON files before adding them as fixtures');
  process.exit(1);
}

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
