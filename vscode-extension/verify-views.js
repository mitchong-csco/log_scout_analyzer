#!/usr/bin/env node

/**
 * Manual View Registration Verification Script
 *
 * This script performs the same checks as the automated tests but runs
 * independently without requiring the VS Code test runner.
 *
 * Usage: node verify-views.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(message) {
  log(`✅ PASS: ${message}`, colors.green);
}

function fail(message) {
  log(`❌ FAIL: ${message}`, colors.red);
}

function warn(message) {
  log(`⚠️  WARN: ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  INFO: ${message}`, colors.blue);
}

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    pass(name);
  } catch (error) {
    failedTests++;
    fail(`${name}\n     ${error.message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n     Expected: ${expected}\n     Actual: ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Load files
const packageJsonPath = path.join(__dirname, 'package.json');
const extensionTsPath = path.join(__dirname, 'src', 'extension.ts');

console.log('\n' + colors.bold + '='.repeat(70) + colors.reset);
console.log(colors.bold + '  View Registration Verification' + colors.reset);
console.log(colors.bold + '='.repeat(70) + colors.reset + '\n');

info(`Loading package.json from: ${packageJsonPath}`);
info(`Loading extension.ts from: ${extensionTsPath}`);

if (!fs.existsSync(packageJsonPath)) {
  fail(`package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

if (!fs.existsSync(extensionTsPath)) {
  fail(`extension.ts not found at ${extensionTsPath}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const extensionSource = fs.readFileSync(extensionTsPath, 'utf8');

console.log('\n' + colors.bold + 'Test Suite: View Container Validation' + colors.reset + '\n');

// Test 1: No empty view containers
test('No empty view containers should exist', () => {
  const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];
  const views = packageJson.contributes?.views || {};

  const emptyContainers = [];

  for (const container of viewContainers) {
    const containerViews = views[container.id] || [];

    if (containerViews.length === 0) {
      emptyContainers.push(container.id);
      info(`  Found empty container: "${container.id}" (${container.title})`);
    } else {
      info(`  Container "${container.id}" has ${containerViews.length} view(s)`);
    }
  }

  assertEquals(
    emptyContainers.length,
    0,
    `Found ${emptyContainers.length} empty container(s): ${emptyContainers.join(', ')}`
  );
});

// Test 2: scout-inventor should not exist (regression test)
test('scout-inventor container should not exist (regression)', () => {
  const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];
  const scoutInventor = viewContainers.find(c => c.id === 'scout-inventor');

  assertEquals(
    scoutInventor,
    undefined,
    'scout-inventor container should have been removed (it was empty and caused errors)'
  );
});

console.log('\n' + colors.bold + 'Test Suite: View Registration Validation' + colors.reset + '\n');

// Test 3: All package.json views have createTreeView calls
test('All package.json views have createTreeView calls in extension.ts', () => {
  const views = packageJson.contributes?.views || {};
  const allViewIds = [];

  for (const containerViews of Object.values(views)) {
    for (const view of containerViews) {
      allViewIds.push(view.id);
    }
  }

  info(`  Found ${allViewIds.length} views in package.json`);

  const missingViews = [];
  const registeredViews = [];

  for (const viewId of allViewIds) {
    const createTreeViewPattern = new RegExp(
      `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,`,
      'i'
    );

    if (createTreeViewPattern.test(extensionSource)) {
      registeredViews.push(viewId);
      info(`    ✓ ${viewId}`);
    } else {
      missingViews.push(viewId);
      warn(`    ✗ ${viewId} - NO createTreeView() call found`);
    }
  }

  assertEquals(
    missingViews.length,
    0,
    `${missingViews.length} view(s) missing createTreeView() calls: ${missingViews.join(', ')}`
  );
});

console.log('\n' + colors.bold + 'Test Suite: Individual View Checks' + colors.reset + '\n');

// Test 4-9: Individual view validations
const expectedViews = [
  'scoutResults',
  'scoutFilters',
  'scoutCategories',
  'scoutAnalyzer',
  'scoutPatternOverrides',
  'scoutBundles',
];

expectedViews.forEach(viewId => {
  test(`View "${viewId}" is declared and registered`, () => {
    // Check package.json
    const views = packageJson.contributes?.views || {};
    const allViewIds = [];

    for (const containerViews of Object.values(views)) {
      for (const view of containerViews) {
        allViewIds.push(view.id);
      }
    }

    assertTrue(
      allViewIds.includes(viewId),
      `View "${viewId}" not found in package.json`
    );

    // Check extension.ts
    const createTreeViewPattern = new RegExp(
      `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,`,
      'i'
    );

    assertTrue(
      createTreeViewPattern.test(extensionSource),
      `View "${viewId}" has no createTreeView() call in extension.ts`
    );
  });
});

console.log('\n' + colors.bold + 'Test Suite: Tree Data Provider Validation' + colors.reset + '\n');

// Test 10: All createTreeView calls have treeDataProvider
test('All createTreeView calls specify treeDataProvider', () => {
  const views = packageJson.contributes?.views || {};
  const allViewIds = [];

  for (const containerViews of Object.values(views)) {
    for (const view of containerViews) {
      allViewIds.push(view.id);
    }
  }

  const missingProviders = [];

  for (const viewId of allViewIds) {
    const providerPattern = new RegExp(
      `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,\\s*{[^}]*treeDataProvider\\s*:`,
      'i'
    );

    if (!providerPattern.test(extensionSource)) {
      missingProviders.push(viewId);
      warn(`    ✗ ${viewId} - missing treeDataProvider property`);
    } else {
      info(`    ✓ ${viewId} has treeDataProvider`);
    }
  }

  assertEquals(
    missingProviders.length,
    0,
    `${missingProviders.length} view(s) missing treeDataProvider: ${missingProviders.join(', ')}`
  );
});

console.log('\n' + colors.bold + 'Test Suite: Regression Tests' + colors.reset + '\n');

// Test 11: Pattern override view should not have conditional registration
test('scoutPatternOverrides should not have conditional registration', () => {
  const conditionalPattern = /if\s*\([^)]*patternOverrideTreeProvider[^)]*\)\s*{\s*[^}]*createTreeView\s*\(\s*["'`]scoutPatternOverrides["'`]/i;

  const hasConditional = conditionalPattern.test(extensionSource);

  assertEquals(
    hasConditional,
    false,
    'scoutPatternOverrides should be registered unconditionally (not wrapped in if statement)'
  );
});

console.log('\n' + colors.bold + 'Test Suite: View Properties' + colors.reset + '\n');

// Test 12: All views have required properties
test('All views have required properties (id, name)', () => {
  const views = packageJson.contributes?.views || {};
  const errors = [];

  for (const [containerId, containerViews] of Object.entries(views)) {
    for (const view of containerViews) {
      if (!view.id) {
        errors.push(`View in container "${containerId}" missing id`);
      }
      if (!view.name) {
        errors.push(`View "${view.id || 'unknown'}" missing name`);
      }
      if (typeof view.id !== 'string') {
        errors.push(`View id should be string, got ${typeof view.id}`);
      }
      if (typeof view.name !== 'string') {
        errors.push(`View name should be string, got ${typeof view.name}`);
      }
    }
  }

  assertEquals(
    errors.length,
    0,
    `Found ${errors.length} property error(s):\n     ${errors.join('\n     ')}`
  );
});

// Test 13: All view IDs are unique
test('All view IDs are unique (no duplicates)', () => {
  const views = packageJson.contributes?.views || {};
  const allViewIds = [];

  for (const containerViews of Object.values(views)) {
    for (const view of containerViews) {
      allViewIds.push(view.id);
    }
  }

  const duplicates = allViewIds.filter(
    (id, index) => allViewIds.indexOf(id) !== index
  );

  assertEquals(
    duplicates.length,
    0,
    `Found ${duplicates.length} duplicate view ID(s): ${duplicates.join(', ')}`
  );
});

// Summary
console.log('\n' + colors.bold + '='.repeat(70) + colors.reset);
console.log(colors.bold + '  Test Results Summary' + colors.reset);
console.log(colors.bold + '='.repeat(70) + colors.reset + '\n');

console.log(`Total Tests:  ${totalTests}`);
log(`Passed:       ${passedTests}`, colors.green);
if (failedTests > 0) {
  log(`Failed:       ${failedTests}`, colors.red);
} else {
  log(`Failed:       ${failedTests}`, colors.green);
}
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (failedTests === 0) {
  log('✅ ALL TESTS PASSED!', colors.green + colors.bold);
  console.log('\nVerification Result: View registration is correct.');
  console.log('The "no data provider registered" error should NOT occur.\n');
  process.exit(0);
} else {
  log('❌ SOME TESTS FAILED!', colors.red + colors.bold);
  console.log('\nVerification Result: View registration has issues.');
  console.log('The "no data provider registered" error MAY occur.\n');
  process.exit(1);
}
