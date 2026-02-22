#!/usr/bin/env node

/**
 * Standalone Wiring Tests Runner
 * Runs unit tests to validate extension wiring without needing VS Code
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Running Extension Wiring Tests\n');
console.log('='.repeat(70));

// Check if compiled tests exist
const outDir = path.join(__dirname, 'out', 'test', 'suite');
const wiringTestPath = path.join(outDir, 'wiring.test.js');

if (!fs.existsSync(wiringTestPath)) {
    console.log('⚠️  Tests not compiled yet. Running compile...\n');
    try {
        execSync('npm run compile', { stdio: 'inherit', cwd: __dirname });
        console.log('\n✅ Compilation complete\n');
    } catch (err) {
        console.error('❌ Compilation failed');
        process.exit(1);
    }
}

// Check again after compile
if (!fs.existsSync(wiringTestPath)) {
    console.error('❌ Test file not found:', wiringTestPath);
    console.error('   Make sure wiring.test.ts exists in src/test/suite/');
    process.exit(1);
}

console.log('📂 Test file found:', wiringTestPath);
console.log('🚀 Running tests...\n');
console.log('='.repeat(70));
console.log('');

try {
    // Run mocha tests
    const mochaPath = path.join(__dirname, 'node_modules', '.bin', 'mocha');

    const command = process.platform === 'win32'
        ? `"${mochaPath}.cmd" "${wiringTestPath}" --ui tdd --color --reporter spec`
        : `"${mochaPath}" "${wiringTestPath}" --ui tdd --color --reporter spec`;

    execSync(command, {
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ All wiring tests passed!\n');
    console.log('🎯 Your extension is properly wired and ready to use.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. npm run deploy      - Build and install extension');
    console.log('  2. Reload VS Code      - Ctrl+Shift+P → "Reload Window"');
    console.log('  3. Test import command - Ctrl+Shift+P → "Scout: Import Log Archive"');
    console.log('');
    process.exit(0);

} catch (err) {
    console.log('\n' + '='.repeat(70));
    console.error('❌ Some wiring tests failed!\n');
    console.error('Please fix the issues above and run again: npm run test:wiring\n');
    process.exit(1);
}
