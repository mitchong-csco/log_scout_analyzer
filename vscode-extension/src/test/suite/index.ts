import * as path from "path";
import Mocha from "mocha";
import * as fs from "fs";

/**
 * Recursively finds all test files in a directory
 */
function findTestFiles(directory: string): string[] {
  const testFiles: string[] = [];

  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively traverse subdirectories
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
        // Add test files
        testFiles.push(fullPath);
      }
    }
  }

  traverse(directory);
  return testFiles;
}

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 10000,
    reporter: "spec",
  });

  const testsRoot = path.resolve(__dirname, "..");
  const suiteRoot = path.join(testsRoot, "suite");

  return new Promise((resolve, reject) => {
    try {
      // Find all test files recursively (including subdirectories)
      const testFiles = findTestFiles(suiteRoot);

      console.log(`Found ${testFiles.length} test files:`);
      testFiles.forEach((file) => {
        const relativePath = path.relative(suiteRoot, file);
        console.log(`  - ${relativePath}`);
      });

      // Add files to the test suite
      testFiles.forEach((file) => {
        mocha.addFile(file);
      });

      // Run the mocha test
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error("Error loading tests:", err);
      reject(err);
    }
  });
}
