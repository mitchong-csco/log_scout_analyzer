#!/usr/bin/env node

/**
 * Find exact line ranges for commands to remove from extension.ts
 */

const fs = require('fs');
const path = require('path');

const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
const content = fs.readFileSync(extensionPath, 'utf8');
const lines = content.split('\n');

const commandsToRemove = [
  'patterns.showStats',
  'dumpDiagnostics',
  'analyzeFile',
  'clearDiagnostics',
  'clearResults',
  'showCacheStats',
  'showPatterns',
  'openExtensionLog',
  'openLSPLog',
  'showLogPaths',
  'openSplitView',
  'closeSplitView',
  'clearConsole',
  'showLadderDiagram',
  'analyzeDirectory',
  'analyzeAllBelow',
  'openAnalyzerPanel',
  'openAnnotationDashboard',
  'toggleConsoleLocation',
  'setTimeframe',
  'toggleFilter',
  'extractSipMessages',
  'copyDiagnosticAtCursor',
  'showPatternById',
];

console.log('Finding command registrations to remove...\n');

commandsToRemove.forEach(cmd => {
  const searchPattern = `logScoutAnalyzer.${cmd}`;

  // Find all lines containing this command
  const matches = [];
  lines.forEach((line, index) => {
    if (line.includes(searchPattern)) {
      matches.push({ line: index + 1, content: line.trim() });
    }
  });

  if (matches.length > 0) {
    console.log(`\n${cmd}:`);
    matches.forEach(m => {
      console.log(`  Line ${m.line}: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
    });
  }
});

console.log('\n\nCommand variable definitions:\n');

// Find const X = vscode.commands.registerCommand patterns
const commandVarPattern = /const (\w+Command) = vscode\.commands\.registerCommand\(/;
const commandRegistrations = [];

lines.forEach((line, index) => {
  const match = line.match(commandVarPattern);
  if (match) {
    const varName = match[1];
    const lineNum = index + 1;

    // Check if this is one we need to remove by looking ahead for the command string
    const nextFewLines = lines.slice(index, Math.min(index + 3, lines.length)).join('\n');

    const isToRemove = commandsToRemove.some(cmd =>
      nextFewLines.includes(`logScoutAnalyzer.${cmd}`)
    );

    if (isToRemove) {
      commandRegistrations.push({ varName, lineNum, line: line.trim() });
    }
  }
});

commandRegistrations.forEach(reg => {
  console.log(`  ${reg.varName} at line ${reg.lineNum}`);
});

console.log('\n\nSubscriptions to remove (context.subscriptions.push):\n');

// Find where these are pushed to context.subscriptions
commandRegistrations.forEach(reg => {
  const pushPattern = new RegExp(`context\\.subscriptions\\.push\\(${reg.varName}\\)`);
  lines.forEach((line, index) => {
    if (pushPattern.test(line)) {
      console.log(`  Line ${index + 1}: context.subscriptions.push(${reg.varName});`);
    }
  });
});

console.log('\n\nDone!\n');
