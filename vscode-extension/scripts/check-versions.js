const { execSync } = require('child_process');

console.log('🔍 Checking Required Versions...');
console.log('='.repeat(60));

const requirements = {
  node: '>=16.0.0',
  npm: '>=8.0.0'
};

let allGood = true;
const issues = [];

/**
 * Get version of a command
 */
function getVersion(command) {
  try {
    const output = execSync(`${command} --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return output.trim().replace(/^v/, ''); // Remove leading 'v' if present
  } catch (error) {
    return null;
  }
}

/**
 * Parse version string to comparable numbers
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const ver1 = parseVersion(v1);
  const ver2 = parseVersion(v2);

  if (ver1.major !== ver2.major) {
    return ver1.major < ver2.major ? -1 : 1;
  }
  if (ver1.minor !== ver2.minor) {
    return ver1.minor < ver2.minor ? -1 : 1;
  }
  if (ver1.patch !== ver2.patch) {
    return ver1.patch < ver2.patch ? -1 : 1;
  }
  return 0;
}

/**
 * Check if version meets requirement
 */
function meetsRequirement(current, requirement) {
  // Parse requirement (e.g., ">=16.0.0")
  const match = requirement.match(/^([><=]+)(.+)$/);
  if (!match) {
    return false;
  }

  const operator = match[1];
  const requiredVersion = match[2];
  const comparison = compareVersions(current, requiredVersion);

  switch (operator) {
    case '>=':
      return comparison >= 0;
    case '>':
      return comparison > 0;
    case '<=':
      return comparison <= 0;
    case '<':
      return comparison < 0;
    case '=':
    case '==':
      return comparison === 0;
    default:
      return false;
  }
}

// =============================================================================
// Check Node.js
// =============================================================================
console.log('\n📦 Node.js');
const nodeVersion = getVersion('node');

if (nodeVersion) {
  console.log(`  Current version: ${nodeVersion}`);
  console.log(`  Required: ${requirements.node}`);

  if (meetsRequirement(nodeVersion, requirements.node)) {
    console.log('  ✅ Node.js version meets requirements');
  } else {
    console.log(`  ❌ Node.js version ${nodeVersion} does not meet requirement ${requirements.node}`);
    issues.push(`Node.js: Need ${requirements.node}, have ${nodeVersion}`);
    allGood = false;
  }
} else {
  console.log('  ❌ Node.js not found or not in PATH');
  issues.push('Node.js: Not found');
  allGood = false;
}

// =============================================================================
// Check npm
// =============================================================================
console.log('\n📦 npm');
const npmVersion = getVersion('npm');

if (npmVersion) {
  console.log(`  Current version: ${npmVersion}`);
  console.log(`  Required: ${requirements.npm}`);

  if (meetsRequirement(npmVersion, requirements.npm)) {
    console.log('  ✅ npm version meets requirements');
  } else {
    console.log(`  ❌ npm version ${npmVersion} does not meet requirement ${requirements.npm}`);
    issues.push(`npm: Need ${requirements.npm}, have ${npmVersion}`);
    allGood = false;
  }
} else {
  console.log('  ❌ npm not found or not in PATH');
  issues.push('npm: Not found');
  allGood = false;
}

// =============================================================================
// Check Git (optional but recommended)
// =============================================================================
console.log('\n📦 Git (optional)');
const gitVersion = getVersion('git');

if (gitVersion) {
  console.log(`  Current version: ${gitVersion}`);
  console.log('  ✅ Git is available');
} else {
  console.log('  ⚠️  Git not found (optional but recommended)');
}

// =============================================================================
// Check TypeScript (should be in node_modules)
// =============================================================================
console.log('\n📦 TypeScript (local)');
try {
  const tscVersion = execSync('npx tsc --version', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  console.log(`  Current version: ${tscVersion.replace('Version ', '')}`);
  console.log('  ✅ TypeScript is available');
} catch (error) {
  console.log('  ⚠️  TypeScript not found (will be installed with npm install)');
}

// =============================================================================
// Check VS Code (optional)
// =============================================================================
console.log('\n📦 VS Code (optional)');
try {
  const codeVersion = execSync('code --version', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim().split('\n')[0];
  console.log(`  Current version: ${codeVersion}`);
  console.log('  ✅ VS Code is available');
} catch (error) {
  console.log('  ⚠️  VS Code command not found (optional)');
  console.log('     Install VS Code and add to PATH for easier testing');
}

// =============================================================================
// System Information
// =============================================================================
console.log('\n💻 System Information');
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Node executable: ${process.execPath}`);

// =============================================================================
// Summary
// =============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 Version Check Summary');
console.log('='.repeat(60));

if (allGood) {
  console.log('✅ All required versions meet requirements!');
  console.log('\nYou are ready to develop on this project.');
  console.log('\nNext steps:');
  console.log('  npm install    # Install dependencies');
  console.log('  npm run compile    # Build the project');
  console.log('  npm run test    # Run tests');
} else {
  console.log('❌ Some requirements are not met:');
  console.log();
  issues.forEach(issue => {
    console.log(`  • ${issue}`);
  });
  console.log();
  console.log('Please update the following:');
  console.log();

  if (issues.some(i => i.startsWith('Node.js'))) {
    console.log('  Node.js:');
    console.log(`    Download from: https://nodejs.org/`);
    console.log(`    Required version: ${requirements.node}`);
    console.log();
  }

  if (issues.some(i => i.startsWith('npm'))) {
    console.log('  npm:');
    console.log(`    Update with: npm install -g npm@latest`);
    console.log(`    Required version: ${requirements.npm}`);
    console.log();
  }
}

console.log('='.repeat(60));
console.log();

// Exit with appropriate code
process.exit(allGood ? 0 : 1);
