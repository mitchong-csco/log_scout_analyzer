import * as assert from "assert";
import * as path from "path";

/**
 * Unit Tests for Command Validation and Logic
 *
 * These tests validate command input handling, validation rules,
 * and business logic without requiring VS Code runtime.
 *
 * Covers:
 * - Input validation for all commands
 * - Error message generation
 * - Command precondition checks
 * - Data transformation for commands
 *
 * Run with: npm run test:wiring (fast, no VS Code launch)
 */

suite("Command Validation - Unit Tests", () => {
  suite("1. Bundle Name Validation", () => {
    test("Should validate minimum length", () => {
      const tests = [
        { name: "", valid: false, reason: "Empty string" },
        { name: "A", valid: true, reason: "Single character" },
        { name: "AB", valid: true, reason: "Two characters" },
      ];

      for (const { name, valid, reason } of tests) {
        const result = validateBundleName(name);
        assert.strictEqual(
          result.isValid,
          valid,
          `${reason}: "${name}" should be ${valid ? "valid" : "invalid"}`
        );
      }
    });

    test("Should validate maximum length", () => {
      const maxLength = 255;
      const validName = "a".repeat(maxLength);
      const tooLong = "a".repeat(maxLength + 1);

      const validResult = validateBundleName(validName);
      assert.ok(validResult.isValid, "Name at max length should be valid");

      const invalidResult = validateBundleName(tooLong);
      assert.ok(!invalidResult.isValid, "Name over max length should be invalid");
      assert.ok(
        invalidResult.error?.includes("long"),
        "Error should mention length"
      );
    });

    test("Should reject filesystem-unsafe characters", () => {
      const unsafeChars = ["<", ">", ":", '"', "/", "\\", "|", "?", "*"];

      for (const char of unsafeChars) {
        const name = `Bundle${char}Name`;
        const result = validateBundleName(name);
        assert.ok(
          !result.isValid,
          `Name with "${char}" should be invalid`
        );
        assert.ok(
          result.error?.includes("character") || result.error?.includes("invalid"),
          `Error should mention invalid character for "${char}"`
        );
      }
    });

    test("Should accept safe special characters", () => {
      const safeNames = [
        "Bundle-Name",
        "Bundle_Name",
        "Bundle (Name)",
        "Bundle [Name]",
        "Bundle.Name",
        "Bundle, Name",
        "Bundle; Name",
        "Bundle's Name",
      ];

      for (const name of safeNames) {
        const result = validateBundleName(name);
        assert.ok(
          result.isValid,
          `Name "${name}" should be valid but got: ${result.error}`
        );
      }
    });

    test("Should provide helpful error messages", () => {
      const tests = [
        {
          name: "",
          expectedError: /empty|required|cannot be blank/i,
        },
        {
          name: "a".repeat(300),
          expectedError: /long|length|characters/i,
        },
        {
          name: "Bundle/Name",
          expectedError: /character|invalid|not allowed/i,
        },
      ];

      for (const { name, expectedError } of tests) {
        const result = validateBundleName(name);
        assert.ok(!result.isValid, `"${name}" should be invalid`);
        assert.ok(
          expectedError.test(result.error || ""),
          `Error message should match pattern for "${name}": ${result.error}`
        );
      }
    });
  });

  suite("2. File Path Validation", () => {
    test("Should validate file existence check requirements", () => {
      const paths = [
        { path: "", shouldExist: true, valid: false },
        { path: null, shouldExist: true, valid: false },
        { path: "C:\\logs\\test.log", shouldExist: false, valid: true },
      ];

      for (const { path: testPath, shouldExist, valid } of paths) {
        const result = validateFilePath(testPath as any, shouldExist);
        assert.strictEqual(
          result.isValid,
          valid,
          `Path validation failed for "${testPath}"`
        );
      }
    });

    test("Should validate absolute vs relative paths", () => {
      const tests = [
        { path: "C:\\logs\\test.log", isAbsolute: true },
        { path: "/var/logs/test.log", isAbsolute: true },
        { path: "logs/test.log", isAbsolute: false },
        { path: "./test.log", isAbsolute: false },
        { path: "../logs/test.log", isAbsolute: false },
      ];

      for (const { path: testPath, isAbsolute } of tests) {
        const result = path.isAbsolute(testPath);
        assert.strictEqual(
          result,
          isAbsolute,
          `Path "${testPath}" absolute check failed`
        );
      }
    });

    test("Should validate log file extensions", () => {
      const tests = [
        { path: "test.log", isLogFile: true },
        { path: "test.txt", isLogFile: true },
        { path: "test.trace", isLogFile: true },
        { path: "test.out", isLogFile: true },
        { path: "test.err", isLogFile: true },
        { path: "test.pdf", isLogFile: false },
        { path: "test.zip", isLogFile: false },
        { path: "test", isLogFile: false },
      ];

      for (const { path: testPath, isLogFile } of tests) {
        const result = isValidLogFile(testPath);
        assert.strictEqual(
          result,
          isLogFile,
          `Log file check failed for "${testPath}"`
        );
      }
    });

    test("Should detect archive file types", () => {
      const tests = [
        { path: "archive.zip", isArchive: true },
        { path: "archive.tar", isArchive: true },
        { path: "archive.tar.gz", isArchive: true },
        { path: "archive.tgz", isArchive: true },
        { path: "archive.log", isArchive: false },
      ];

      for (const { path: testPath, isArchive } of tests) {
        const result = isArchiveFile(testPath);
        assert.strictEqual(
          result,
          isArchive,
          `Archive detection failed for "${testPath}"`
        );
      }
    });

    test("Should normalize path separators", () => {
      const tests = [
        {
          input: "C:\\logs\\test.log",
          expected: "C:/logs/test.log",
        },
        {
          input: "C:/logs/test.log",
          expected: "C:/logs/test.log",
        },
        {
          input: "logs\\subfolder\\file.txt",
          expected: "logs/subfolder/file.txt",
        },
      ];

      for (const { input, expected } of tests) {
        const normalized = normalizePath(input);
        assert.strictEqual(
          normalized,
          expected,
          `Path normalization failed for "${input}"`
        );
      }
    });
  });

  suite("3. Archive Import Validation", () => {
    test("Should validate archive file format", () => {
      const validArchives = [
        "logs.zip",
        "archive.tar",
        "bundle.tar.gz",
        "compressed.tgz",
      ];

      for (const archive of validArchives) {
        const result = validateArchiveFormat(archive);
        assert.ok(
          result.isValid,
          `Archive "${archive}" should be valid`
        );
      }
    });

    test("Should reject invalid archive formats", () => {
      const invalidArchives = [
        "file.txt",
        "document.pdf",
        "image.png",
        "archive.rar", // Not supported
        "archive.7z", // Not supported
      ];

      for (const archive of invalidArchives) {
        const result = validateArchiveFormat(archive);
        assert.ok(
          !result.isValid,
          `Archive "${archive}" should be invalid`
        );
      }
    });

    test("Should validate bundle name from import", () => {
      const tests = [
        {
          filename: "700123456_qcsone_download.zip",
          expectedName: "700123456_qcsone_download",
          caseId: "700123456",
        },
        {
          filename: "my-logs.zip",
          expectedName: "my-logs",
          caseId: undefined,
        },
        {
          filename: "bundle.tar.gz",
          expectedName: "bundle",
          caseId: undefined,
        },
      ];

      for (const { filename, expectedName, caseId } of tests) {
        const result = extractBundleNameFromArchive(filename);
        assert.strictEqual(
          result.name,
          expectedName,
          `Bundle name extraction failed for "${filename}"`
        );
        assert.strictEqual(
          result.caseId,
          caseId,
          `Case ID extraction failed for "${filename}"`
        );
      }
    });

    test("Should generate custom bundle name when provided", () => {
      const filename = "archive.zip";
      const customName = "My Custom Bundle";

      const result = extractBundleNameFromArchive(filename, customName);
      assert.strictEqual(
        result.name,
        customName,
        "Should use custom name when provided"
      );
    });
  });

  suite("4. Pattern Override Validation", () => {
    test("Should validate regex patterns", () => {
      const validPatterns = [
        "ERROR.*",
        "\\d{3}-\\d{3}-\\d{4}",
        "^(INFO|WARN|ERROR)",
        "[A-Z]+",
      ];

      for (const pattern of validPatterns) {
        const result = validateRegexPattern(pattern);
        assert.ok(
          result.isValid,
          `Pattern "${pattern}" should be valid`
        );
      }
    });

    test("Should reject invalid regex patterns", () => {
      const invalidPatterns = [
        "[unclosed",
        "(?:incomplete",
        "\\",
        "(unmatched",
      ];

      for (const pattern of invalidPatterns) {
        const result = validateRegexPattern(pattern);
        assert.ok(
          !result.isValid,
          `Pattern "${pattern}" should be invalid`
        );
        assert.ok(
          result.error,
          `Should provide error for invalid pattern "${pattern}"`
        );
      }
    });

    test("Should validate severity levels", () => {
      const validSeverities = ["error", "warning", "info", "hint"];

      for (const severity of validSeverities) {
        const result = validateSeverity(severity);
        assert.ok(
          result,
          `Severity "${severity}" should be valid`
        );
      }
    });

    test("Should reject invalid severity levels", () => {
      const invalidSeverities = ["critical", "debug", "trace", ""];

      for (const severity of invalidSeverities) {
        const result = validateSeverity(severity);
        assert.ok(
          !result,
          `Severity "${severity}" should be invalid`
        );
      }
    });

    test("Should validate pattern priority", () => {
      const tests = [
        { priority: 1, valid: true },
        { priority: 10, valid: true },
        { priority: 100, valid: true },
        { priority: 0, valid: false },
        { priority: -1, valid: false },
        { priority: 1001, valid: false },
      ];

      for (const { priority, valid } of tests) {
        const result = validatePatternPriority(priority);
        assert.strictEqual(
          result,
          valid,
          `Priority ${priority} validation failed`
        );
      }
    });
  });

  suite("5. Command Preconditions", () => {
    test("Should check if workspace is open", () => {
      // Simulate workspace states
      const hasWorkspace = checkWorkspaceOpen([
        { uri: { fsPath: "C:\\workspace" } as any },
      ]);
      const noWorkspace = checkWorkspaceOpen(undefined);

      assert.ok(hasWorkspace, "Should detect open workspace");
      assert.ok(!noWorkspace, "Should detect no workspace");
    });

    test("Should check if file is open in editor", () => {
      const tests = [
        {
          editor: { document: { uri: { fsPath: "test.log" } } },
          hasFile: true,
        },
        {
          editor: undefined,
          hasFile: false,
        },
      ];

      for (const { editor, hasFile } of tests) {
        const result = hasActiveFile(editor as any);
        assert.strictEqual(
          result,
          hasFile,
          "Active file check failed"
        );
      }
    });

    test("Should check if LSP is available", () => {
      const tests = [
        { client: { state: 2 }, available: true }, // Running
        { client: { state: 1 }, available: false }, // Starting
        { client: { state: 3 }, available: false }, // Stopped
        { client: undefined, available: false },
      ];

      for (const { client, available } of tests) {
        const result = isLSPAvailable(client as any);
        assert.strictEqual(
          result,
          available,
          `LSP availability check failed for state ${client?.state}`
        );
      }
    });

    test("Should check bundle existence", () => {
      const existingBundles = ["bundle_1", "bundle_2", "bundle_3"];

      assert.ok(
        bundleExists("bundle_1", existingBundles),
        "Should find existing bundle"
      );
      assert.ok(
        !bundleExists("bundle_99", existingBundles),
        "Should not find non-existent bundle"
      );
    });
  });

  suite("6. Input Sanitization", () => {
    test("Should sanitize bundle descriptions", () => {
      const tests = [
        {
          input: "Normal description",
          expected: "Normal description",
        },
        {
          input: "Description with <html>",
          expected: "Description with &lt;html&gt;",
        },
        {
          input: 'Description with "quotes"',
          expected: "Description with &quot;quotes&quot;",
        },
        {
          input: "Multiple   spaces",
          expected: "Multiple spaces",
        },
      ];

      for (const { input, expected } of tests) {
        const sanitized = sanitizeDescription(input);
        assert.strictEqual(
          sanitized,
          expected,
          `Sanitization failed for "${input}"`
        );
      }
    });

    test("Should trim whitespace from inputs", () => {
      const tests = [
        { input: "  test  ", expected: "test" },
        { input: "\ttest\t", expected: "test" },
        { input: "\ntest\n", expected: "test" },
      ];

      for (const { input, expected } of tests) {
        const trimmed = input.trim();
        assert.strictEqual(
          trimmed,
          expected,
          `Trim failed for "${input}"`
        );
      }
    });

    test("Should sanitize file paths for display", () => {
      const tests = [
        {
          input: "C:\\Users\\username\\file.log",
          expected: "C:/Users/username/file.log",
        },
        {
          input: "/home/user/file.log",
          expected: "/home/user/file.log",
        },
      ];

      for (const { input, expected } of tests) {
        const sanitized = sanitizePathForDisplay(input);
        assert.strictEqual(
          sanitized,
          expected,
          `Path sanitization failed for "${input}"`
        );
      }
    });
  });

  suite("7. Error Message Generation", () => {
    test("Should generate user-friendly error messages", () => {
      const tests = [
        {
          error: "ENOENT",
          context: "file",
          expected: /not found|does not exist/i,
        },
        {
          error: "EACCES",
          context: "file",
          expected: /permission|access denied/i,
        },
        {
          error: "EISDIR",
          context: "file",
          expected: /directory|folder/i,
        },
      ];

      for (const { error, context, expected } of tests) {
        const message = generateErrorMessage(error, context);
        assert.ok(
          expected.test(message),
          `Error message for ${error} should match pattern: ${message}`
        );
      }
    });

    test("Should include helpful suggestions in errors", () => {
      const error = generateValidationError(
        "Bundle name contains invalid characters"
      );

      assert.ok(
        error.includes("invalid character") || error.includes("not allowed"),
        "Should mention invalid characters"
      );
      assert.ok(
        error.length > 20,
        "Should be descriptive (>20 chars)"
      );
    });

    test("Should format error messages consistently", () => {
      const errors = [
        generateErrorMessage("ENOENT", "file"),
        generateErrorMessage("EACCES", "directory"),
        generateErrorMessage("UNKNOWN", "operation"),
      ];

      for (const error of errors) {
        assert.ok(
          error.length > 0,
          "Error message should not be empty"
        );
        assert.ok(
          error[0] === error[0].toUpperCase(),
          "Error should start with capital letter"
        );
        assert.ok(
          !error.endsWith(".") || error.endsWith("!"),
          "Error punctuation should be consistent"
        );
      }
    });
  });

  suite("8. Data Transformation", () => {
    test("Should transform bundle metadata for display", () => {
      const metadata = {
        case_id: "700123456",
        created_at: "2024-02-21T10:30:00Z",
        files: 5,
        size_bytes: 1024 * 1024 * 10,
      };

      const display = transformBundleMetadata(metadata);

      assert.ok(display.caseId, "Should have case ID");
      assert.ok(display.created, "Should have creation date");
      assert.ok(display.fileCount, "Should have file count");
      assert.ok(display.size, "Should have formatted size");
    });

    test("Should transform diagnostic for display", () => {
      const diagnostic = {
        severity: 0, // Error
        message: "Test error",
        range: { start: { line: 10 }, end: { line: 10 } },
      };

      const display = transformDiagnosticForDisplay(diagnostic);

      assert.ok(display.severity, "Should have severity");
      assert.ok(display.message, "Should have message");
      assert.ok(display.line, "Should have line number");
    });

    test("Should convert timestamps to local time", () => {
      const utc = "2024-02-21T10:30:00Z";
      const local = convertToLocalTime(utc);

      assert.ok(local, "Should return local time");
      assert.notStrictEqual(local, utc, "Should be different from UTC");
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (Validation logic)
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

function validateBundleName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Bundle name cannot be empty" };
  }

  if (name.length > 255) {
    return { isValid: false, error: "Bundle name is too long (max 255 characters)" };
  }

  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: "Bundle name contains invalid characters" };
  }

  return { isValid: true };
}

function validateFilePath(filePath: string, shouldExist: boolean): ValidationResult {
  if (!filePath) {
    return { isValid: false, error: "File path is required" };
  }

  // Additional existence check would require fs in actual implementation
  return { isValid: true };
}

function isValidLogFile(filename: string): boolean {
  const logExtensions = [".log", ".txt", ".trace", ".out", ".err"];
  const ext = path.extname(filename).toLowerCase();
  return logExtensions.includes(ext);
}

function isArchiveFile(filename: string): boolean {
  const archiveExtensions = [".zip", ".tar", ".tar.gz", ".tgz"];
  const lower = filename.toLowerCase();
  return archiveExtensions.some(ext => lower.endsWith(ext));
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function validateArchiveFormat(filename: string): ValidationResult {
  if (isArchiveFile(filename)) {
    return { isValid: true };
  }
  return { isValid: false, error: "Unsupported archive format" };
}

function extractBundleNameFromArchive(
  filename: string,
  customName?: string
): { name: string; caseId?: string } {
  if (customName) {
    return { name: customName };
  }

  const baseName = path.basename(filename, path.extname(filename));
  // Remove .tar from .tar.gz
  const cleanName = baseName.replace(/\.tar$/, "");

  const caseId = cleanName.match(/700\d{6}/)?.[0];

  return { name: cleanName, caseId };
}

function validateRegexPattern(pattern: string): ValidationResult {
  try {
    new RegExp(pattern);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
}

function validateSeverity(severity: string): boolean {
  return ["error", "warning", "info", "hint"].includes(severity);
}

function validatePatternPriority(priority: number): boolean {
  return priority > 0 && priority <= 1000;
}

function checkWorkspaceOpen(folders: any): boolean {
  return folders && folders.length > 0;
}

function hasActiveFile(editor: any): boolean {
  return editor && editor.document && editor.document.uri;
}

function isLSPAvailable(client: any): boolean {
  return client && client.state === 2; // Running state
}

function bundleExists(bundleId: string, bundles: string[]): boolean {
  return bundles.includes(bundleId);
}

function sanitizeDescription(desc: string): string {
  return desc
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizePathForDisplay(filePath: string): string {
  return normalizePath(filePath);
}

function generateErrorMessage(error: string, context: string): string {
  const messages: Record<string, string> = {
    ENOENT: `The ${context} was not found`,
    EACCES: `Access denied to ${context}`,
    EISDIR: `Expected ${context}, but found directory`,
  };

  return messages[error] || `An error occurred with ${context}`;
}

function generateValidationError(message: string): string {
  return message;
}

function transformBundleMetadata(metadata: any): any {
  return {
    caseId: metadata.case_id,
    created: metadata.created_at,
    fileCount: metadata.files,
    size: `${(metadata.size_bytes / (1024 * 1024)).toFixed(1)} MB`,
  };
}

function transformDiagnosticForDisplay(diagnostic: any): any {
  return {
    severity: ["Error", "Warning", "Info", "Hint"][diagnostic.severity],
    message: diagnostic.message,
    line: diagnostic.range.start.line + 1,
  };
}

function convertToLocalTime(utc: string): string {
  return new Date(utc).toLocaleString();
}
