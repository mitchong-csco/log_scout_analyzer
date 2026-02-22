const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Detecting changed files...\n');

try {
  // Get changed files from git
  const changedOutput = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim();

  if (!changedOutput) {
    console.log('ℹ️  No changes detected. Running all wiring tests.');
    execSync('npm run test:wiring', { stdio: 'inherit' });
    process.exit(0);
  }

  const changed = changedOutput
    .split('\n')
    .filter(file => file.includes('vscode-extension'))
    .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'));

  if (changed.length === 0) {
    console.log('ℹ️  No TypeScript changes in extension. Running wiring tests.');
    execSync('npm run test:wiring', { stdio: 'inherit' });
    process.exit(0);
  }

  console.log('📝 Changed files:');
  changed.forEach(file => console.log(`  - ${file}`));
  console.log();

  // Find corresponding test files
  const testFiles = [];

  changed.forEach(file => {
    // Try to find corresponding test file
    const relativePath = file.replace('vscode-extension/', '');
    const testFile = relativePath.replace(/\.ts$/, '.test.ts');
    const fullTestPath = path.join(process.cwd(), 'src', 'test', 'suite', path.basename(testFile));

    if (fs.existsSync(fullTestPath)) {
      testFiles.push(fullTestPath);
    }
  });

  if (testFiles.length === 0) {
    console.log('ℹ️  No specific test files found for changes.');
    console.log('   Running wiring tests to validate basic functionality.\n');
    execSync('npm run test:wiring', { stdio: 'inherit' });
  } else {
    console.log('🧪 Running tests for changed files:');
    testFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
    console.log();

    const testPaths = testFiles.map(f => `"${f}"`).join(' ');
    execSync(`mocha ${testPaths} --require ts-node/register`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  }

  console.log('\n✅ Changed file tests passed!');
  process.exit(0);

} catch (error) {
  if (error.status) {
    console.error('\n❌ Tests failed!');
    process.exit(error.status);
  } else {
    console.error('\n❌ Error running tests:', error.message);
    console.log('\n⚠️  Falling back to wiring tests...');
    try {
      execSync('npm run test:wiring', { stdio: 'inherit' });
    } catch (e) {
      process.exit(1);
    }
  }
}
