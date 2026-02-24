#!/usr/bin/env node

/**
 * Command Registration Verification Script
 *
 * Verifies bidirectionally that:
 * 1. Every command in package.json has a handler in extension.ts
 * 2. Every handler in extension.ts is declared in package.json
 * 3. Commands that depend on LSP/tree providers are properly wired
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

function logSuccess(message) {
  log(GREEN, `✓ ${message}`);
}

function logError(message) {
  log(RED, `✗ ${message}`);
}

function logWarning(message) {
  log(YELLOW, `⚠ ${message}`);
}

// Load package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Load extension.ts
const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
const extensionContent = fs.readFileSync(extensionPath, 'utf8');
const lines = extensionContent.split('\n');

// Load bundleTreeProvider.ts
const bundleProviderPath = path.join(__dirname, '..', 'src', 'bundleTreeProvider.ts');
const bundleProviderContent = fs.readFileSync(bundleProviderPath, 'utf8');

// Load patternOverrideUI.ts
const patternUIPath = path.join(__dirname, '..', 'src', 'patternOverrideUI.ts');
const patternUIContent = fs.readFileSync(patternUIPath, 'utf8');

console.log('\n========================================');
console.log('  COMMAND REGISTRATION VERIFICATION');
console.log('========================================\n');

// Extract all commands from package.json
const commands = packageJson.contributes.commands;
const commandIds = commands.map(c => c.command);

console.log(`Found ${commandIds.length} commands in package.json\n`);

// Test 1: Forward check - package.json → extension.ts
console.log('TEST 1: Every package.json command has a handler\n');
const orphanedCommands = [];
const registeredCommands = [];

commandIds.forEach(cmdId => {
  const registrationPattern = new RegExp(
    `registerCommand\\s*\\(\\s*["'\`]${cmdId.replace(/\./g, '\\.')}["'\`]`,
    'g'
  );

  if (registrationPattern.test(extensionContent)) {
    logSuccess(cmdId);
    registeredCommands.push(cmdId);
  } else {
    logError(`${cmdId} - NO HANDLER FOUND`);
    orphanedCommands.push(cmdId);
  }
});

console.log(`\nRegistered: ${registeredCommands.length}/${commandIds.length}`);

if (orphanedCommands.length > 0) {
  console.log('\n❌ ORPHANED COMMANDS:');
  orphanedCommands.forEach(cmd => logError(`   ${cmd}`));
  console.log('\nThese commands are defined in package.json but have no handler in extension.ts!');
} else {
  logSuccess('\nAll package.json commands are registered!\n');
}

// Test 2: Backward check - extension.ts → package.json
console.log('\nTEST 2: No unregistered handlers in extension.ts\n');
const registerPattern = /registerCommand\s*\(\s*["']([^"']+)["']/g;
const matches = [...extensionContent.matchAll(registerPattern)];
const registeredInExtension = matches.map(m => m[1]);

const declaredCommandIds = new Set(commandIds);
const extraCommands = registeredInExtension.filter(
  cmd => cmd.startsWith('logScoutAnalyzer.') && !declaredCommandIds.has(cmd)
);

// Check which extra commands are marked as deprecated
const deprecatedCommands = [];
const undocumentedCommands = [];

extraCommands.forEach(cmd => {
  // Search for this command's registration in extension.ts
  const cmdPattern = new RegExp(`["']${cmd.replace(/\./g, '\\.')}["']`);
  let foundDeprecated = false;

  for (let i = 0; i < lines.length; i++) {
    if (cmdPattern.test(lines[i])) {
      // Look at previous lines for @deprecated comment
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (lines[j].includes('@deprecated')) {
          deprecatedCommands.push(cmd);
          foundDeprecated = true;
          break;
        }
      }
      break;
    }
  }

  if (!foundDeprecated) {
    undocumentedCommands.push(cmd);
  }
});

if (deprecatedCommands.length > 0) {
  console.log(`⚠ ${deprecatedCommands.length} deprecated command(s) (hidden from Command Palette):`);
  deprecatedCommands.forEach(cmd => logWarning(`   ${cmd}`));
  console.log('   These are marked for future removal.\n');
}

if (undocumentedCommands.length > 0) {
  console.log('❌ Commands registered but not in package.json:');
  undocumentedCommands.forEach(cmd => logError(`   ${cmd}`));
  console.log('\nThese should either be added to package.json or removed from extension.ts');
} else if (deprecatedCommands.length === 0) {
  logSuccess('No extra commands found\n');
}

// Test 3: Bundle commands wiring
console.log('\nTEST 3: Bundle commands are properly wired\n');
const bundleCommands = [
  { command: 'logScoutAnalyzer.bundle.create', method: 'createBundle' },
  { command: 'logScoutAnalyzer.bundle.delete', method: 'deleteBundle' },
  { command: 'logScoutAnalyzer.bundle.analyze', method: 'analyzeBundle' },
  { command: 'logScoutAnalyzer.bundle.importPackage', method: 'importPackage' },
  { command: 'logScoutAnalyzer.bundle.refresh', method: 'refresh' },
];

const bundleWiringErrors = [];

bundleCommands.forEach(({ command, method }) => {
  // Check if command handler exists
  const handlerPattern = new RegExp(
    `registerCommand\\s*\\(\\s*["']${command.replace(/\./g, '\\.')}["']`,
    'g'
  );
  const hasHandler = handlerPattern.test(extensionContent);

  // Check if method exists in bundleTreeProvider
  const methodPattern = new RegExp(`(async\\s+)?${method}\\s*\\(`);
  const hasMethod = methodPattern.test(bundleProviderContent);

  if (hasHandler && hasMethod) {
    logSuccess(`${command} → bundleTreeProvider.${method}()`);
  } else {
    if (!hasHandler) {
      logError(`${command} - NO HANDLER in extension.ts`);
      bundleWiringErrors.push(`${command}: missing handler`);
    }
    if (!hasMethod) {
      logError(`${command} - NO METHOD ${method}() in bundleTreeProvider.ts`);
      bundleWiringErrors.push(`${command}: missing method ${method}()`);
    }
  }
});

if (bundleWiringErrors.length === 0) {
  logSuccess('\nAll bundle commands properly wired!\n');
}

// Test 4: Pattern commands wiring
console.log('\nTEST 4: Pattern commands are properly wired\n');
const patternCommands = [
  { command: 'logScoutAnalyzer.patterns.createOverride', uiFunction: 'createOverrideQuickInput' },
  { command: 'logScoutAnalyzer.patterns.createCustom', uiFunction: 'createCustomPatternWizard' },
  { command: 'logScoutAnalyzer.patterns.editOverride', uiFunction: 'editPatternQuickInput' },
  { command: 'logScoutAnalyzer.patterns.deleteOverride', uiFunction: 'deletePatternQuickPick' },
  { command: 'logScoutAnalyzer.patterns.togglePattern', uiFunction: 'togglePatternQuickPick' },
];

const patternWiringErrors = [];

patternCommands.forEach(({ command, uiFunction }) => {
  const handlerPattern = new RegExp(
    `registerCommand\\s*\\(\\s*["']${command.replace(/\./g, '\\.')}["']`,
    'g'
  );
  const hasHandler = handlerPattern.test(extensionContent);

  const uiFunctionPattern = new RegExp(`(export\\s+)?async\\s+function\\s+${uiFunction}\\s*\\(`);
  const hasUIFunction = uiFunctionPattern.test(patternUIContent);

  if (hasHandler && hasUIFunction) {
    logSuccess(`${command} → ${uiFunction}()`);
  } else {
    if (!hasHandler) {
      logError(`${command} - NO HANDLER in extension.ts`);
      patternWiringErrors.push(`${command}: missing handler`);
    }
    if (!hasUIFunction) {
      logError(`${command} - NO FUNCTION ${uiFunction}() in patternOverrideUI.ts`);
      patternWiringErrors.push(`${command}: missing UI function ${uiFunction}()`);
    }
  }
});

if (patternWiringErrors.length === 0) {
  logSuccess('\nAll pattern commands properly wired!\n');
}

// Test 5: Context menu commands
console.log('\nTEST 5: Context menu commands have handlers\n');
const contextMenus = packageJson.contributes.menus['view/item/context'] || [];
const contextCommands = [...new Set(contextMenus.map(m => m.command))];

const contextErrors = [];

contextCommands.forEach(cmdId => {
  const registrationPattern = new RegExp(
    `registerCommand\\s*\\(\\s*["'\`]${cmdId.replace(/\./g, '\\.')}["'\`]`,
    'g'
  );

  if (registrationPattern.test(extensionContent)) {
    logSuccess(cmdId);
  } else {
    logError(`${cmdId} - NO HANDLER`);
    contextErrors.push(cmdId);
  }
});

if (contextErrors.length === 0) {
  logSuccess('\nAll context menu commands have handlers!\n');
}

// Final summary
console.log('\n========================================');
console.log('  SUMMARY');
console.log('========================================\n');

// Count only real errors (not deprecated commands)
const totalErrors = orphanedCommands.length +
                   undocumentedCommands.length +
                   bundleWiringErrors.length +
                   patternWiringErrors.length +
                   contextErrors.length;

if (totalErrors === 0) {
  logSuccess('✅ ALL TESTS PASSED!');
  logSuccess(`   ${commandIds.length} commands verified`);
  logSuccess('   All commands properly registered');
  logSuccess('   All dependencies properly wired');
  if (deprecatedCommands.length > 0) {
    logWarning(`   ${deprecatedCommands.length} deprecated command(s) marked for removal`);
  }
  console.log();
  process.exit(0);
} else {
  logError(`❌ FOUND ${totalErrors} ERROR(S):`);
  if (orphanedCommands.length > 0) {
    logError(`   ${orphanedCommands.length} orphaned command(s)`);
  }
  if (undocumentedCommands.length > 0) {
    logError(`   ${undocumentedCommands.length} undocumented command(s)`);
  }
  if (bundleWiringErrors.length > 0) {
    logError(`   ${bundleWiringErrors.length} bundle wiring error(s)`);
  }
  if (patternWiringErrors.length > 0) {
    logError(`   ${patternWiringErrors.length} pattern wiring error(s)`);
  }
  if (contextErrors.length > 0) {
    logError(`   ${contextErrors.length} context menu error(s)`);
  }
  if (deprecatedCommands.length > 0) {
    logWarning(`\nNote: ${deprecatedCommands.length} deprecated command(s) are not counted as errors`);
  }
  console.log();
  process.exit(1);
}
