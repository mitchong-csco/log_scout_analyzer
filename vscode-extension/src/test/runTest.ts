import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test runner script
    // Passed to `--extensionTestsPath`
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Path to test workspace
    const testWorkspace = path.resolve(__dirname, '../../../test-data');

    console.log('Extension Development Path:', extensionDevelopmentPath);
    console.log('Extension Tests Path:', extensionTestsPath);
    console.log('Test Workspace:', testWorkspace);

    // Always run in headless mode for reliability and consistency
    console.log('🤖 Running in headless mode');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions', // Disable other extensions for clean testing
        testWorkspace,          // Open test workspace
        '--disable-workspace-trust', // Skip workspace trust prompt in tests
        '--disable-gpu',        // Disable GPU acceleration for headless
        '--no-sandbox',         // Required for some CI environments
        '--headless',           // Always run in headless mode
      ],
    });

    console.log('✅ All tests passed!');
  } catch (err) {
    console.error('❌ Failed to run tests');
    console.error(err);
    process.exit(1);
  }
}

main();
