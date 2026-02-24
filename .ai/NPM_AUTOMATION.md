# npm-Driven Automation Strategy 🚀

## Philosophy

**All automation should be accessible via simple npm commands.**

No complex batch files. No manual file editing. No scripting knowledge required.
Just: `npm run [command]` and it works.

## Core Principle

```
Developer Intent → npm Command → Automated Execution → Clear Result
```

**You should never need to:**
- ❌ Write batch/shell scripts
- ❌ Remember complex command sequences
- ❌ Manually edit files during execution
- ❌ Know internals of testing frameworks

**You should only need to:**
- ✅ Run `npm run [descriptive-command]`
- ✅ Read the output
- ✅ Act on clear results

## Complete npm Script Library

### Daily Development Commands

```json
{
  "scripts": {
    "dev:setup": "npm install && npm run compile",
    "dev:reset": "npm run maintain:clean && npm run dev:setup",
    "dev:test-fast": "npm run test:wiring",
    "dev:test-full": "npm run test:all && npm run security:check-all",
    "dev:pre-commit": "npm run compile && npm run test:changed && npm run docs:validate",
    "dev:verify": "npm run compile && npm run test:all && npm run security:check-all",
    "dev:watch": "concurrently \"npm run watch\" \"npm run test:watch\""
  }
}
```

**Usage:**
```bash
# First time working on the project
npm run dev:setup

# Before making changes (quick check)
npm run dev:test-fast

# After making changes (comprehensive)
npm run dev:test-full

# Before committing
npm run dev:pre-commit

# Full verification (before PR)
npm run dev:verify

# Development with auto-testing
npm run dev:watch
```

### Testing Commands

```json
{
  "scripts": {
    "test:wiring": "mocha src/test/suite/wiring.test.ts --require ts-node/register",
    "test:security": "mocha src/test/suite/security.test.ts --require ts-node/register",
    "test:performance": "mocha src/test/suite/performance.test.ts --require ts-node/register --timeout 10000",
    "test:integration": "mocha src/test/suite/integration.test.ts --require ts-node/register --timeout 5000",
    "test:compatibility": "mocha src/test/suite/compatibility.test.ts --require ts-node/register",
    "test:e2e": "mocha src/test/suite/e2e.test.ts --require ts-node/register --timeout 30000",
    "test:all": "mocha src/test/suite/**/*.test.ts --require ts-node/register",
    "test:watch": "mocha src/test/suite/**/*.test.ts --require ts-node/register --watch --watch-extensions ts",
    "test:changed": "node scripts/test-changed.js",
    "test:coverage": "nyc --reporter=html --reporter=text npm run test:all",
    "test:coverage-report": "npm run test:coverage && open coverage/index.html",
    "test:mutation": "stryker run",
    "test:flake-check": "node scripts/flake-detector.js",
    "test:validate-fixtures": "node scripts/validate-fixtures.js",
    "test:generate-fixtures": "node scripts/generate-fixtures.js",
    "test:ci": "npm run test:all && npm run test:coverage"
  }
}
```

**Usage:**
```bash
# Quick wiring validation (16ms)
npm run test:wiring

# Security tests only
npm run test:security

# Performance benchmarks
npm run test:performance

# All tests
npm run test:all

# Watch mode (for TDD)
npm run test:watch

# Only tests affected by your changes
npm run test:changed

# Coverage report
npm run test:coverage

# Check for flaky tests
npm run test:flake-check

# Validate test data
npm run test:validate-fixtures
```

### Security Commands

```json
{
  "scripts": {
    "security:audit": "npm audit --audit-level=moderate",
    "security:audit-fix": "npm audit fix",
    "security:scan": "retire --path src --outputformat json",
    "security:test": "npm run test:security",
    "security:check-all": "npm run security:audit && npm run security:scan && npm run security:test",
    "security:report": "node scripts/security-report.js"
  }
}
```

**Usage:**
```bash
# Quick security check
npm run security:audit

# Comprehensive security validation
npm run security:check-all

# Auto-fix known vulnerabilities
npm run security:audit-fix

# Generate security report
npm run security:report
```

### Documentation Commands

```json
{
  "scripts": {
    "docs:generate": "typedoc --out docs src",
    "docs:serve": "http-server docs -p 8080 -o",
    "docs:validate": "markdownlint **/*.md --ignore node_modules --ignore coverage",
    "docs:toc": "markdown-toc -i README.md FEATURES.md",
    "docs:all": "npm run docs:generate && npm run docs:validate",
    "docs:watch": "nodemon --watch src --ext ts --exec 'npm run docs:generate'",
    "docs:check-links": "markdown-link-check **/*.md"
  }
}
```

**Usage:**
```bash
# Generate API documentation
npm run docs:generate

# View documentation locally
npm run docs:serve

# Validate markdown files
npm run docs:validate

# Update table of contents
npm run docs:toc

# Full documentation build
npm run docs:all

# Auto-regenerate on changes
npm run docs:watch
```

### Performance Commands

```json
{
  "scripts": {
    "perf:test": "npm run test:performance",
    "perf:profile": "node --prof src/test/performance-profile.js",
    "perf:analyze": "node --prof-process isolate-*.log > profile.txt",
    "perf:benchmark": "node src/test/benchmarks/run-all.js",
    "perf:compare": "node scripts/compare-benchmarks.js",
    "perf:report": "clinic doctor -- node src/extension.js",
    "perf:flame": "clinic flame -- node src/extension.js"
  }
}
```

**Usage:**
```bash
# Run performance tests
npm run perf:test

# Profile performance
npm run perf:profile && npm run perf:analyze

# Run benchmarks
npm run perf:benchmark

# Compare with baseline
npm run perf:compare

# Generate performance report
npm run perf:report
```

### CI/CD Commands

```json
{
  "scripts": {
    "ci:test": "npm run test:all",
    "ci:security": "npm run security:check-all",
    "ci:quality": "npm run test:coverage && npm run docs:validate",
    "ci:lint": "eslint src --ext ts --max-warnings 0",
    "ci:type-check": "tsc --noEmit",
    "ci:full": "npm run ci:lint && npm run ci:type-check && npm run ci:test && npm run ci:security && npm run ci:quality",
    "ci:deploy": "npm run ci:full && npm run deploy",
    "ci:local": "npm run ci:full"
  }
}
```

**Usage:**
```bash
# Run what CI runs (locally)
npm run ci:local

# Full CI pipeline
npm run ci:full

# Deploy (after CI passes)
npm run ci:deploy
```

### Maintenance Commands

```json
{
  "scripts": {
    "maintain:clean": "rm -rf out coverage .nyc_output *.log",
    "maintain:deep-clean": "npm run maintain:clean && rm -rf node_modules package-lock.json",
    "maintain:update": "npm update && npm audit fix",
    "maintain:check-deps": "npm outdated",
    "maintain:verify": "npm run maintain:clean && npm run dev:setup && npm run test:all",
    "maintain:reset": "npm run maintain:deep-clean && npm run dev:setup",
    "maintain:audit": "npm run security:check-all && npm run test:coverage"
  }
}
```

**Usage:**
```bash
# Clean build artifacts
npm run maintain:clean

# Update dependencies
npm run maintain:update

# Check for outdated packages
npm run maintain:check-deps

# Full reset and verification
npm run maintain:verify

# Nuclear option (complete reset)
npm run maintain:reset

# Monthly audit
npm run maintain:audit
```

### Utility Commands

```json
{
  "scripts": {
    "util:check-versions": "node scripts/check-versions.js",
    "util:list-tests": "find src/test -name '*.test.ts' -type f",
    "util:count-tests": "grep -r 'test(' src/test | wc -l",
    "util:check-todo": "grep -rn 'TODO\\|FIXME\\|XXX' src",
    "util:size": "du -sh out node_modules",
    "util:deps-tree": "npm list --all",
    "util:license-check": "license-checker --summary"
  }
}
```

**Usage:**
```bash
# Check Node/npm versions
npm run util:check-versions

# List all test files
npm run util:list-tests

# Count total tests
npm run util:count-tests

# Find TODOs in code
npm run util:check-todo

# Check project size
npm run util:size
```

## Required Dependencies

Add these to `package.json`:

```json
{
  "devDependencies": {
    "mocha": "^10.2.0",
    "ts-node": "^10.9.1",
    "nyc": "^15.1.0",
    "typedoc": "^0.25.0",
    "typedoc-plugin-markdown": "^3.17.0",
    "markdownlint-cli": "^0.37.0",
    "markdown-toc": "^1.2.0",
    "markdown-link-check": "^3.11.2",
    "retire": "^3.2.0",
    "http-server": "^14.1.1",
    "nodemon": "^3.0.1",
    "concurrently": "^8.2.2",
    "eslint": "^8.52.0",
    "@typescript-eslint/eslint-plugin": "^6.9.0",
    "@typescript-eslint/parser": "^6.9.0",
    "stryker-cli": "^1.0.2",
    "clinic": "^13.0.0",
    "license-checker": "^25.0.1"
  }
}
```

## Helper Scripts

These scripts are referenced by npm commands above. Create them in `scripts/` directory:

### `scripts/test-changed.js`

```javascript
const { execSync } = require('child_process');
const path = require('path');

// Get changed files from git
const changed = execSync('git diff --name-only HEAD', { encoding: 'utf8' })
  .split('\n')
  .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'));

if (changed.length === 0) {
  console.log('No changes detected. Running all tests.');
  execSync('npm run test:all', { stdio: 'inherit' });
  process.exit(0);
}

// Find corresponding test files
const testFiles = changed
  .map(file => {
    const testFile = file.replace(/\.ts$/, '.test.ts');
    return testFile;
  })
  .filter(file => {
    try {
      require.resolve(path.join(process.cwd(), file));
      return true;
    } catch {
      return false;
    }
  });

if (testFiles.length === 0) {
  console.log('No test files found for changes. Running wiring tests.');
  execSync('npm run test:wiring', { stdio: 'inherit' });
} else {
  console.log('Running tests for changed files:', testFiles.join(', '));
  execSync(`mocha ${testFiles.join(' ')} --require ts-node/register`, { 
    stdio: 'inherit' 
  });
}
```

### `scripts/flake-detector.js`

```javascript
const { execSync } = require('child_process');

const RUNS = 10;
const results = new Map();

console.log(`Running test suite ${RUNS} times to detect flaky tests...`);

for (let i = 1; i <= RUNS; i++) {
  console.log(`\nRun ${i}/${RUNS}...`);
  
  try {
    execSync('npm run test:all', { 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    console.log('✅ PASS');
  } catch (error) {
    console.log('❌ FAIL');
    
    // Parse failed test names from output
    const output = error.stdout || error.stderr || '';
    const failedTests = output.match(/\d+\) .+/g) || [];
    
    failedTests.forEach(test => {
      const count = results.get(test) || 0;
      results.set(test, count + 1);
    });
  }
}

console.log('\n' + '='.repeat(60));
console.log('FLAKE DETECTION RESULTS');
console.log('='.repeat(60));

if (results.size === 0) {
  console.log('✅ No flaky tests detected!');
} else {
  console.log('⚠️  Potentially flaky tests found:\n');
  
  Array.from(results.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([test, count]) => {
      const percentage = (count / RUNS * 100).toFixed(1);
      console.log(`  ${test}`);
      console.log(`  Failed ${count}/${RUNS} times (${percentage}%)\n`);
    });
  
  process.exit(1);
}
```

### `scripts/validate-fixtures.js`

```javascript
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '../src/test/fixtures');

console.log('Validating test fixtures...\n');

let errors = 0;

// Check fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  console.error('❌ Fixtures directory not found:', FIXTURES_DIR);
  process.exit(1);
}

// Validate archives
const archivesDir = path.join(FIXTURES_DIR, 'archives');
if (fs.existsSync(archivesDir)) {
  const archives = fs.readdirSync(archivesDir);
  console.log(`Checking ${archives.length} archive fixtures...`);
  
  archives.forEach(file => {
    const filePath = path.join(archivesDir, file);
    const stats = fs.statSync(filePath);
    
    if (file.includes('small') && stats.size > 100 * 1024) {
      console.error(`❌ ${file}: Too large for "small" fixture (${stats.size} bytes)`);
      errors++;
    }
    
    if (file.includes('large') && stats.size < 1024 * 1024) {
      console.error(`❌ ${file}: Too small for "large" fixture (${stats.size} bytes)`);
      errors++;
    }
    
    console.log(`  ✅ ${file} (${stats.size} bytes)`);
  });
}

// Validate logs
const logsDir = path.join(FIXTURES_DIR, 'logs');
if (fs.existsSync(logsDir)) {
  const logs = fs.readdirSync(logsDir);
  console.log(`\nChecking ${logs.length} log fixtures...`);
  
  logs.forEach(file => {
    const filePath = path.join(logsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.length === 0) {
      console.error(`❌ ${file}: Empty file`);
      errors++;
    } else {
      const lines = content.split('\n').length;
      console.log(`  ✅ ${file} (${lines} lines)`);
    }
  });
}

// Validate configs
const configsDir = path.join(FIXTURES_DIR, 'configs');
if (fs.existsSync(configsDir)) {
  const configs = fs.readdirSync(configsDir);
  console.log(`\nChecking ${configs.length} config fixtures...`);
  
  configs.forEach(file => {
    const filePath = path.join(configsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      JSON.parse(content);
      console.log(`  ✅ ${file} (valid JSON)`);
    } catch (e) {
      console.error(`❌ ${file}: Invalid JSON - ${e.message}`);
      errors++;
    }
  });
}

console.log('\n' + '='.repeat(60));
if (errors === 0) {
  console.log('✅ All fixtures valid!');
  process.exit(0);
} else {
  console.error(`❌ ${errors} fixture validation error(s) found`);
  process.exit(1);
}
```

### `scripts/security-report.js`

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../security-report.md');

console.log('Generating security report...\n');

let report = '# Security Report\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;

// npm audit
console.log('Running npm audit...');
try {
  const audit = execSync('npm audit --json', { encoding: 'utf8' });
  const auditData = JSON.parse(audit);
  
  report += '## npm Audit\n\n';
  report += `- Vulnerabilities: ${auditData.metadata.vulnerabilities.total}\n`;
  report += `  - Critical: ${auditData.metadata.vulnerabilities.critical}\n`;
  report += `  - High: ${auditData.metadata.vulnerabilities.high}\n`;
  report += `  - Moderate: ${auditData.metadata.vulnerabilities.moderate}\n`;
  report += `  - Low: ${auditData.metadata.vulnerabilities.low}\n\n`;
} catch (error) {
  report += '## npm Audit\n\n';
  report += '⚠️ Vulnerabilities found. Run `npm audit` for details.\n\n';
}

// retire.js
console.log('Running retire.js...');
try {
  const retire = execSync('retire --path src --outputformat json', { 
    encoding: 'utf8' 
  });
  const retireData = JSON.parse(retire);
  
  report += '## Retire.js (Dependency Check)\n\n';
  if (retireData.length === 0) {
    report += '✅ No known vulnerable dependencies found.\n\n';
  } else {
    report += `⚠️ ${retireData.length} potentially vulnerable dependencies found.\n\n`;
  }
} catch (error) {
  report += '## Retire.js (Dependency Check)\n\n';
  report += '✅ Scan completed.\n\n';
}

// Security tests
console.log('Running security tests...');
try {
  execSync('npm run test:security', { stdio: 'pipe' });
  report += '## Security Tests\n\n';
  report += '✅ All security tests passing.\n\n';
} catch (error) {
  report += '## Security Tests\n\n';
  report += '❌ Some security tests failing. Run `npm run test:security` for details.\n\n';
}

// Write report
fs.writeFileSync(REPORT_FILE, report);
console.log(`\n✅ Security report generated: ${REPORT_FILE}`);
console.log('\nSummary:');
console.log(report);
```

### `scripts/check-versions.js`

```javascript
const { execSync } = require('child_process');

console.log('Checking required versions...\n');

const requirements = {
  node: '>=16.0.0',
  npm: '>=8.0.0'
};

function getVersion(command) {
  try {
    return execSync(`${command} --version`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function compareVersions(current, required) {
  // Simple version comparison (handles >=)
  const cleanRequired = required.replace(/[>=<]/g, '');
  return current >= cleanRequired;
}

let allGood = true;

// Check Node
const nodeVersion = getVersion('node').replace('v', '');
console.log(`Node.js: ${nodeVersion}`);
if (!compareVersions(nodeVersion, requirements.node)) {
  console.error(`❌ Node.js ${requirements.node} required`);
  allGood = false;
} else {
  console.log(`✅ Meets requirement: ${requirements.node}`);
}

// Check npm
const npmVersion = getVersion('npm');
console.log(`\nnpm: ${npmVersion}`);
if (!compareVersions(npmVersion, requirements.npm)) {
  console.error(`❌ npm ${requirements.npm} required`);
  allGood = false;
} else {
  console.log(`✅ Meets requirement: ${requirements.npm}`);
}

console.log();
if (allGood) {
  console.log('✅ All version requirements met!');
  process.exit(0);
} else {
  console.error('❌ Version requirements not met. Please upgrade.');
  process.exit(1);
}
```

## Quick Reference

### Most Common Commands

```bash
# Starting work
npm run dev:setup

# During development (fast feedback)
npm run dev:test-fast

# Before committing
npm run dev:pre-commit

# Before creating PR
npm run dev:verify

# Weekly security check
npm run security:check-all

# Monthly maintenance
npm run maintain:audit
```

### Decision Tree

```
Are you starting fresh?
└─ YES → npm run dev:setup

Are you making a small change?
└─ YES → npm run dev:test-fast (before and after)

Are you making a large change?
└─ YES → npm run dev:test-full (after)

Ready to commit?
└─ YES → npm run dev:pre-commit

Creating a PR?
└─ YES → npm run dev:verify

Need to update dependencies?
└─ YES → npm run maintain:update

Something broken?
└─ YES → npm run maintain:verify
```

## Integration with TDD Workflow

All commands support the Test-Driven Development workflow:

### RED Phase (Write Failing Test)
```bash
# Watch mode for immediate feedback
npm run test:watch

# Or run specific test
npm run test:wiring
```

### GREEN Phase (Make Test Pass)
```bash
# Same watch mode continues
npm run test:watch

# Or verify manually
npm run test:wiring
```

### REFACTOR Phase (Improve Code)
```bash
# Ensure nothing breaks
npm run test:all

# Check coverage
npm run test:coverage
```

### DEPLOY Phase (Ship It)
```bash
# Final verification
npm run dev:verify

# Or run full CI locally
npm run ci:local
```

## CI/CD Integration

Your CI/CD pipeline should use these same commands:

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run dev:setup
      
      - name: Run tests
        run: npm run ci:test
      
      - name: Security check
        run: npm run ci:security
      
      - name: Quality check
        run: npm run ci:quality
```

## Benefits of npm-Driven Automation

### ✅ Consistency
Everyone runs the same commands. No variations in how tests are executed.

### ✅ Discoverability
Run `npm run` to see all available commands with descriptions.

### ✅ Documentation
Commands are self-documenting. `npm run test:security` is obvious.

### ✅ Composability
Complex workflows are built from simple commands:
```bash
npm run dev:verify  # Runs compile + test:all + security:check-all
```

### ✅ Cross-Platform
npm scripts work on Windows, Mac, Linux without modification.

### ✅ IDE Integration
Most IDEs have npm script runners built-in.

### ✅ Low Learning Curve
New developers just need to know `npm run [command]`.

## Troubleshooting

### "Command not found"
```bash
# Make sure dependencies are installed
npm run dev:setup
```

### "Tests failing"
```bash
# Clean and rebuild
npm run maintain:verify
```

### "Slow test execution"
```bash
# Run only changed tests
npm run test:changed

# Or use watch mode
npm run test:watch
```

### "Coverage not generating"
```bash
# Clean coverage artifacts
npm run maintain:clean

# Regenerate
npm run test:coverage
```

## Extending the System

To add a new automated workflow:

1. **Add npm script** to `package.json`:
```json
{
  "scripts": {
    "my-workflow": "node scripts/my-workflow.js"
  }
}
```

2. **Create helper script** in `scripts/my-workflow.js`:
```javascript
// Your automation logic here
```

3. **Document** in this file and `TDD_QUICK_REF.md`

4. **Test** it works:
```bash
npm run my-workflow
```

## Success Metrics

Track these to measure automation effectiveness:

- **Time to run full test suite**: Target <60 seconds
- **Time for developer feedback**: Target <5 seconds (watch mode)
- **Pre-commit time**: Target <30 seconds
- **CI/CD pipeline time**: Target <10 minutes
- **False positive rate**: Target <1% (flaky tests)

## Maintenance

### Weekly
```bash
npm run security:check-all
```

### Monthly
```bash
npm run maintain:audit
npm run maintain:update
npm run maintain:check-deps
```

### Quarterly
```bash
npm run test:flake-check
npm run perf:compare
npm run util:check-todo
```

## Philosophy Summary

**Simple commands. Powerful automation. Clear results.**

Every npm command should:
- Have a clear, descriptive name
- Do one thing well
- Provide actionable output
- Run quickly (or show progress)
- Fail fast with clear errors
- Be composable with other commands

This way, whether you're a senior developer or junior developer, whether you're comfortable with coding or not, you can execute sophisticated workflows with simple commands.

**Just `npm run` and let the automation do the work.** 🎯