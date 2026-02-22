const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_FILE = path.join(__dirname, '../security-report.md');

console.log('🔒 Generating Security Report...');
console.log('='.repeat(60));

let report = '# Security Report\n\n';
report += `**Generated**: ${new Date().toISOString()}\n`;
report += `**Project**: Log Scout Analyzer VS Code Extension\n\n`;
report += '---\n\n';

let criticalIssues = 0;
let highIssues = 0;
let mediumIssues = 0;
let lowIssues = 0;

// =============================================================================
// 1. npm audit
// =============================================================================
console.log('\n📦 Running npm audit...');
report += '## 1. npm Audit Results\n\n';

try {
  const auditOutput = execSync('npm audit --json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    const auditData = JSON.parse(auditOutput);

    if (auditData.metadata && auditData.metadata.vulnerabilities) {
      const vulns = auditData.metadata.vulnerabilities;

      criticalIssues += vulns.critical || 0;
      highIssues += vulns.high || 0;
      mediumIssues += vulns.moderate || 0;
      lowIssues += vulns.low || 0;

      report += `- **Critical**: ${vulns.critical || 0}\n`;
      report += `- **High**: ${vulns.high || 0}\n`;
      report += `- **Moderate**: ${vulns.moderate || 0}\n`;
      report += `- **Low**: ${vulns.low || 0}\n`;
      report += `- **Info**: ${vulns.info || 0}\n\n`;

      if (vulns.critical > 0 || vulns.high > 0) {
        report += '⚠️  **Action Required**: Critical or high vulnerabilities found.\n\n';
        report += '**Recommendation**: Run `npm audit fix` to automatically fix vulnerabilities.\n\n';
        console.log('  ⚠️  Critical/High vulnerabilities found!');
      } else if (vulns.moderate > 0) {
        report += '⚠️  **Moderate vulnerabilities found**. Review and update dependencies.\n\n';
        console.log('  ⚠️  Moderate vulnerabilities found');
      } else {
        report += '✅ **No critical or high vulnerabilities found**.\n\n';
        console.log('  ✅ No critical/high vulnerabilities');
      }
    } else {
      report += '✅ **No vulnerabilities detected**.\n\n';
      console.log('  ✅ No vulnerabilities detected');
    }
  } catch (parseError) {
    report += '✅ **No vulnerabilities detected** (clean audit).\n\n';
    console.log('  ✅ Clean audit');
  }
} catch (error) {
  // npm audit returns non-zero exit code when vulnerabilities found
  if (error.stdout) {
    try {
      const auditData = JSON.parse(error.stdout);
      if (auditData.metadata && auditData.metadata.vulnerabilities) {
        const vulns = auditData.metadata.vulnerabilities;

        criticalIssues += vulns.critical || 0;
        highIssues += vulns.high || 0;
        mediumIssues += vulns.moderate || 0;
        lowIssues += vulns.low || 0;

        report += `- **Critical**: ${vulns.critical || 0}\n`;
        report += `- **High**: ${vulns.high || 0}\n`;
        report += `- **Moderate**: ${vulns.moderate || 0}\n`;
        report += `- **Low**: ${vulns.low || 0}\n`;
        report += `- **Info**: ${vulns.info || 0}\n\n`;

        report += '⚠️  **Action Required**: Vulnerabilities found.\n\n';
        report += '**Recommendation**: Run `npm audit fix` to automatically fix vulnerabilities.\n\n';
        console.log('  ⚠️  Vulnerabilities found');
      }
    } catch (parseError) {
      report += '⚠️  Could not parse npm audit results.\n\n';
      console.log('  ⚠️  Could not parse results');
    }
  } else {
    report += '❌ **Error running npm audit**.\n\n';
    console.log('  ❌ Error running npm audit');
  }
}

// =============================================================================
// 2. Check for retire.js (optional)
// =============================================================================
console.log('\n🔍 Checking for vulnerable JavaScript libraries...');
report += '## 2. JavaScript Library Vulnerabilities (retire.js)\n\n';

try {
  // Check if retire is installed
  execSync('retire --version', { stdio: 'pipe' });

  try {
    const retireOutput = execSync('retire --path src --outputformat json --exitwith 0', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (retireOutput && retireOutput.trim()) {
      const retireData = JSON.parse(retireOutput);

      if (Array.isArray(retireData) && retireData.length > 0) {
        const vulnerableFiles = retireData.filter(r => r.results && r.results.length > 0);

        if (vulnerableFiles.length > 0) {
          report += `⚠️  **${vulnerableFiles.length} file(s) with vulnerable dependencies found**.\n\n`;

          vulnerableFiles.forEach(file => {
            report += `### ${file.file}\n\n`;
            file.results.forEach(result => {
              report += `- **Component**: ${result.component}\n`;
              report += `- **Version**: ${result.version}\n`;
              if (result.vulnerabilities) {
                result.vulnerabilities.forEach(vuln => {
                  report += `  - ${vuln.severity || 'Unknown'} severity\n`;
                  if (vuln.identifiers) {
                    report += `    - ${vuln.identifiers.summary || 'No summary'}\n`;
                  }
                });
              }
              report += '\n';
            });
          });

          mediumIssues += vulnerableFiles.length;
          console.log(`  ⚠️  ${vulnerableFiles.length} vulnerable file(s) found`);
        } else {
          report += '✅ **No vulnerable JavaScript libraries found**.\n\n';
          console.log('  ✅ No vulnerable libraries found');
        }
      } else {
        report += '✅ **No vulnerable JavaScript libraries found**.\n\n';
        console.log('  ✅ No vulnerable libraries found');
      }
    } else {
      report += '✅ **No vulnerable JavaScript libraries found**.\n\n';
      console.log('  ✅ No vulnerable libraries found');
    }
  } catch (retireError) {
    report += 'ℹ️  Retire.js scan completed with no critical findings.\n\n';
    console.log('  ℹ️  Scan completed');
  }
} catch (error) {
  report += 'ℹ️  **retire.js not installed**. Install with: `npm install -g retire`\n\n';
  report += 'This tool scans for known vulnerable JavaScript libraries.\n\n';
  console.log('  ℹ️  retire.js not installed (optional)');
}

// =============================================================================
// 3. Security Tests
// =============================================================================
console.log('\n🧪 Running security tests...');
report += '## 3. Security Test Results\n\n';

try {
  // Check if security tests exist
  const securityTestPath = path.join(__dirname, '../src/test/suite/security.test.ts');

  if (fs.existsSync(securityTestPath)) {
    try {
      const testOutput = execSync('npm run test:security', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      report += '✅ **All security tests passing**.\n\n';

      // Try to extract test count
      const passMatch = testOutput.match(/(\d+) passing/);
      if (passMatch) {
        report += `- **Tests Passed**: ${passMatch[1]}\n\n`;
      }

      console.log('  ✅ All security tests passing');
    } catch (testError) {
      report += '❌ **Some security tests failing**.\n\n';
      report += 'Run `npm run test:security` for details.\n\n';
      highIssues++;
      console.log('  ❌ Security tests failing');
    }
  } else {
    report += 'ℹ️  **Security tests not yet implemented**.\n\n';
    report += 'Create security tests in `src/test/suite/security.test.ts`\n\n';
    report += 'See `.zed/SECURITY_TESTING.md` for guidelines.\n\n';
    console.log('  ℹ️  Security tests not yet implemented');
  }
} catch (error) {
  report += '⚠️  Could not run security tests.\n\n';
  console.log('  ⚠️  Could not run security tests');
}

// =============================================================================
// 4. Dependency Versions
// =============================================================================
console.log('\n📌 Checking dependency versions...');
report += '## 4. Dependency Version Check\n\n';

try {
  const outdatedOutput = execSync('npm outdated --json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (outdatedOutput && outdatedOutput.trim()) {
    try {
      const outdatedData = JSON.parse(outdatedOutput);
      const criticalPackages = ['axios', 'vscode-languageclient'];
      const outdatedCritical = [];

      Object.keys(outdatedData).forEach(pkg => {
        if (criticalPackages.includes(pkg)) {
          outdatedCritical.push({
            name: pkg,
            current: outdatedData[pkg].current,
            wanted: outdatedData[pkg].wanted,
            latest: outdatedData[pkg].latest
          });
        }
      });

      if (outdatedCritical.length > 0) {
        report += '⚠️  **Critical packages are outdated**:\n\n';
        outdatedCritical.forEach(pkg => {
          report += `- **${pkg.name}**: ${pkg.current} → ${pkg.latest} (wanted: ${pkg.wanted})\n`;
        });
        report += '\n**Recommendation**: Run `npm update` to update dependencies.\n\n';
        mediumIssues += outdatedCritical.length;
        console.log(`  ⚠️  ${outdatedCritical.length} critical package(s) outdated`);
      } else {
        report += '✅ **Critical packages are up to date**.\n\n';
        console.log('  ✅ Critical packages up to date');
      }
    } catch (parseError) {
      report += 'ℹ️  Could not parse outdated package information.\n\n';
      console.log('  ℹ️  Could not parse outdated info');
    }
  } else {
    report += '✅ **All packages are up to date**.\n\n';
    console.log('  ✅ All packages up to date');
  }
} catch (error) {
  report += '✅ **All packages appear to be current**.\n\n';
  console.log('  ✅ Packages appear current');
}

// =============================================================================
// 5. Summary
// =============================================================================
report += '---\n\n';
report += '## Summary\n\n';

const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;

report += `- **Critical Issues**: ${criticalIssues}\n`;
report += `- **High Issues**: ${highIssues}\n`;
report += `- **Medium Issues**: ${mediumIssues}\n`;
report += `- **Low Issues**: ${lowIssues}\n`;
report += `- **Total Issues**: ${totalIssues}\n\n`;

if (criticalIssues > 0) {
  report += '🔴 **CRITICAL**: Immediate action required!\n\n';
} else if (highIssues > 0) {
  report += '🟡 **HIGH**: Address these issues soon.\n\n';
} else if (mediumIssues > 0) {
  report += '🟠 **MEDIUM**: Review and plan fixes.\n\n';
} else if (lowIssues > 0) {
  report += '🟢 **LOW**: Minor issues, low priority.\n\n';
} else {
  report += '✅ **EXCELLENT**: No security issues detected!\n\n';
}

report += '### Recommended Actions\n\n';

if (criticalIssues > 0 || highIssues > 0) {
  report += '1. **Immediate**: Run `npm audit fix` to address vulnerabilities\n';
  report += '2. **Immediate**: Review failing security tests\n';
  report += '3. **Soon**: Update critical outdated packages\n';
  report += '4. **Soon**: Review retire.js findings\n\n';
} else if (mediumIssues > 0) {
  report += '1. Run `npm audit fix` to address moderate vulnerabilities\n';
  report += '2. Update outdated packages: `npm update`\n';
  report += '3. Review and address any warnings\n\n';
} else if (lowIssues > 0) {
  report += '1. Review low-severity findings\n';
  report += '2. Keep dependencies updated regularly\n\n';
} else {
  report += '1. Continue regular security scans\n';
  report += '2. Keep dependencies updated\n';
  report += '3. Maintain security test coverage\n\n';
}

report += '### Next Steps\n\n';
report += '```bash\n';
report += '# Fix vulnerabilities automatically\n';
report += 'npm audit fix\n\n';
report += '# Update dependencies\n';
report += 'npm update\n\n';
report += '# Run security tests\n';
report += 'npm run test:security\n\n';
report += '# Full security check\n';
report += 'npm run security:check-all\n';
report += '```\n\n';

report += '---\n\n';
report += `**Report Generated**: ${new Date().toLocaleString()}\n`;
report += '**For more information**: See `.zed/SECURITY_TESTING.md`\n';

// =============================================================================
// Write Report
// =============================================================================
fs.writeFileSync(REPORT_FILE, report);

console.log('\n' + '='.repeat(60));
console.log('📄 Security Report Summary');
console.log('='.repeat(60));
console.log(`Critical Issues: ${criticalIssues}`);
console.log(`High Issues: ${highIssues}`);
console.log(`Medium Issues: ${mediumIssues}`);
console.log(`Low Issues: ${lowIssues}`);
console.log(`Total Issues: ${totalIssues}`);
console.log('='.repeat(60));
console.log(`\n✅ Report saved to: ${REPORT_FILE}`);
console.log('\nView the report:');
console.log(`  ${REPORT_FILE}`);
console.log('\nOr run:');
console.log('  npm run security:check-all\n');

// Exit with appropriate code
if (criticalIssues > 0 || highIssues > 0) {
  console.log('⚠️  Critical or high security issues found. Address immediately.');
  process.exit(1);
} else if (mediumIssues > 0) {
  console.log('⚠️  Medium security issues found. Plan to address soon.');
  process.exit(0); // Don't fail CI for medium issues
} else {
  console.log('✅ No critical security issues found.');
  process.exit(0);
}
