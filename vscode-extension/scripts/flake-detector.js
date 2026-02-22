const { execSync } = require('child_process');

const RUNS = parseInt(process.env.FLAKE_RUNS || '10', 10);
const results = new Map();
let totalRuns = 0;
let failedRuns = 0;

console.log('🔍 Flaky Test Detector');
console.log('='.repeat(60));
console.log(`Running test suite ${RUNS} times to detect flaky tests...\n`);

for (let i = 1; i <= RUNS; i++) {
  process.stdout.write(`Run ${i}/${RUNS}... `);
  totalRuns++;

  try {
    execSync('npm run test:all', {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('✅ PASS');
  } catch (error) {
    console.log('❌ FAIL');
    failedRuns++;

    // Parse failed test names from output
    const output = error.stdout || error.stderr || '';
    const lines = output.split('\n');

    // Extract test failure information
    lines.forEach((line, idx) => {
      // Look for mocha test failure patterns
      if (line.trim().match(/^\d+\)/)) {
        // This is a failed test line
        const testName = line.trim();
        const count = results.get(testName) || 0;
        results.set(testName, count + 1);
      }
    });
  }

  // Small delay between runs to avoid resource contention
  if (i < RUNS) {
    execSync('timeout /t 1 /nobreak > nul 2>&1', { stdio: 'ignore' });
  }
}

console.log('\n' + '='.repeat(60));
console.log('FLAKE DETECTION RESULTS');
console.log('='.repeat(60));
console.log(`Total runs: ${totalRuns}`);
console.log(`Passed: ${totalRuns - failedRuns}/${totalRuns} (${((totalRuns - failedRuns) / totalRuns * 100).toFixed(1)}%)`);
console.log(`Failed: ${failedRuns}/${totalRuns} (${(failedRuns / totalRuns * 100).toFixed(1)}%)`);
console.log();

if (results.size === 0) {
  if (failedRuns === 0) {
    console.log('✅ No flaky tests detected! All runs passed.');
    process.exit(0);
  } else {
    console.log('⚠️  Tests failed but no specific failures identified.');
    console.log('   This might indicate an environmental issue.');
    process.exit(1);
  }
} else {
  console.log('⚠️  Potentially flaky tests found:\n');

  Array.from(results.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([test, count]) => {
      const percentage = (count / RUNS * 100).toFixed(1);
      const severity = count >= RUNS * 0.5 ? '🔴' : count >= RUNS * 0.2 ? '🟡' : '🟢';

      console.log(`  ${severity} ${test}`);
      console.log(`     Failed ${count}/${RUNS} times (${percentage}%)`);

      if (count >= RUNS * 0.5) {
        console.log(`     ⚠️  HIGH: This test is very flaky - consider fixing or quarantining`);
      } else if (count >= RUNS * 0.2) {
        console.log(`     ⚠️  MEDIUM: This test shows flaky behavior`);
      } else {
        console.log(`     ℹ️  LOW: Minor flakiness detected`);
      }
      console.log();
    });

  console.log('='.repeat(60));
  console.log('RECOMMENDATIONS:');
  console.log('1. Review flaky tests for timing issues, race conditions');
  console.log('2. Add proper waits/retries where needed');
  console.log('3. Consider quarantining high-flake tests');
  console.log('4. Run flake check on individual tests: npm run test:flake-check');
  console.log('='.repeat(60));

  process.exit(1);
}
