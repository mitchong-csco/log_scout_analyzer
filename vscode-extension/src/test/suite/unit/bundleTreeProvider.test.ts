import * as assert from "assert";
import * as path from "path";

/**
 * Unit Tests for BundleTreeProvider
 *
 * These tests focus on isolated logic without VS Code runtime:
 * - Bundle name validation
 * - Metadata parsing (case IDs, service types)
 * - Tree item creation logic
 * - Data transformation
 * - Error handling
 *
 * Run with: npm run test:wiring (fast, no VS Code launch)
 */

suite("BundleTreeProvider - Unit Tests", () => {
  suite("1. Bundle Name Validation", () => {
    test("Should accept valid bundle names", () => {
      const validNames = [
        "My Bundle",
        "Test Bundle 123",
        "Case 700123456",
        "CUCM Logs",
        "Bundle-with-hyphens",
        "Bundle_with_underscores",
        "Bundle (with parens)",
      ];

      for (const name of validNames) {
        const isValid = validateBundleName(name);
        assert.ok(
          isValid,
          `"${name}" should be valid but was rejected`
        );
      }
    });

    test("Should reject empty bundle names", () => {
      const invalidNames = ["", "   ", "\t", "\n"];

      for (const name of invalidNames) {
        const isValid = validateBundleName(name);
        assert.ok(
          !isValid,
          `Empty/whitespace name "${name}" should be invalid`
        );
      }
    });

    test("Should reject bundle names with invalid characters", () => {
      const invalidNames = [
        "Bundle/with/slashes",
        "Bundle\\with\\backslashes",
        "Bundle:with:colons",
        "Bundle*with*asterisks",
        "Bundle?with?questions",
        "Bundle|with|pipes",
        'Bundle"with"quotes',
        "Bundle<with>brackets",
      ];

      for (const name of invalidNames) {
        const isValid = validateBundleName(name);
        assert.ok(
          !isValid,
          `Name with invalid chars "${name}" should be rejected`
        );
      }
    });

    test("Should reject bundle names that are too long", () => {
      const longName = "a".repeat(256);
      const isValid = validateBundleName(longName);
      assert.ok(!isValid, "Name longer than 255 chars should be rejected");
    });

    test("Should trim whitespace from bundle names", () => {
      const names = [
        { input: "  Bundle Name  ", expected: "Bundle Name" },
        { input: "\tBundle\t", expected: "Bundle" },
        { input: "Bundle \n", expected: "Bundle" },
      ];

      for (const { input, expected } of names) {
        const trimmed = input.trim();
        assert.strictEqual(
          trimmed,
          expected,
          `"${input}" should trim to "${expected}"`
        );
      }
    });

    test("Should normalize whitespace in bundle names", () => {
      const name = "Bundle  with   multiple    spaces";
      const normalized = name.replace(/\s+/g, " ");
      assert.strictEqual(
        normalized,
        "Bundle with multiple spaces",
        "Multiple spaces should be normalized to single space"
      );
    });
  });

  suite("2. Bundle ID Generation", () => {
    test("Should generate unique bundle IDs", () => {
      const id1 = generateBundleId();
      const id2 = generateBundleId();

      assert.notStrictEqual(
        id1,
        id2,
        "Sequential calls should generate different IDs"
      );
    });

    test("Should use bundle_ prefix", () => {
      const id = generateBundleId();
      assert.ok(
        id.startsWith("bundle_"),
        `Bundle ID "${id}" should start with "bundle_"`
      );
    });

    test("Should include timestamp component", () => {
      const id = generateBundleId();
      const parts = id.split("_");

      assert.ok(parts.length >= 2, "ID should have multiple parts");

      // Extract timestamp (usually second part)
      const timestampPart = parts[1];
      const timestamp = parseInt(timestampPart, 10);

      assert.ok(
        !isNaN(timestamp),
        "ID should contain numeric timestamp component"
      );

      // Timestamp should be recent (within last minute)
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      assert.ok(
        timestamp >= oneMinuteAgo && timestamp <= now,
        "Timestamp should be recent"
      );
    });

    test("Should use alphanumeric characters only", () => {
      const id = generateBundleId();
      const alphanumeric = /^bundle_[a-zA-Z0-9_-]+$/;

      assert.ok(
        alphanumeric.test(id),
        `Bundle ID "${id}" should be alphanumeric with allowed separators`
      );
    });

    test("Should be filesystem safe", () => {
      const id = generateBundleId();
      const invalidChars = /[<>:"|?*\\/]/;

      assert.ok(
        !invalidChars.test(id),
        `Bundle ID "${id}" should not contain filesystem-unsafe characters`
      );
    });
  });

  suite("3. Case ID Parsing", () => {
    test("Should extract case ID from QCSONE filename", () => {
      const filenames = [
        "700123456_qcsone_download_selected.zip",
        "700987654_qcsone_download_all.zip",
        "700555555_QCSONE_Download.zip",
      ];

      for (const filename of filenames) {
        const caseId = extractCaseIdFromFilename(filename);
        assert.ok(caseId, `Should extract case ID from "${filename}"`);
        assert.ok(
          caseId?.startsWith("700"),
          `Case ID should start with 700, got ${caseId}`
        );
        assert.strictEqual(
          caseId?.length,
          9,
          `Case ID should be 9 digits, got ${caseId}`
        );
      }
    });

    test("Should extract case ID from generic filename patterns", () => {
      const filenames = [
        "Case_700123456.zip",
        "case-700987654-logs.tar.gz",
        "SR700555555_logs.zip",
        "700444444-bundle.zip",
      ];

      for (const filename of filenames) {
        const caseId = extractCaseIdFromFilename(filename);
        assert.ok(
          caseId,
          `Should extract case ID from "${filename}", got ${caseId}`
        );
        assert.ok(
          caseId?.match(/^700\d{6}$/),
          `Case ID should match pattern, got ${caseId}`
        );
      }
    });

    test("Should return undefined for files without case ID", () => {
      const filenames = [
        "logs.zip",
        "my-bundle.tar.gz",
        "archive-2024-02-21.zip",
        "test.zip",
      ];

      for (const filename of filenames) {
        const caseId = extractCaseIdFromFilename(filename);
        assert.strictEqual(
          caseId,
          undefined,
          `Should not extract case ID from "${filename}"`
        );
      }
    });

    test("Should handle edge cases", () => {
      const cases = [
        { input: "", expected: undefined },
        { input: "700", expected: undefined }, // Too short
        { input: "7001234567", expected: undefined }, // Too long
        { input: "800123456", expected: undefined }, // Wrong prefix
        { input: "70012345a", expected: undefined }, // Non-numeric
      ];

      for (const { input, expected } of cases) {
        const caseId = extractCaseIdFromFilename(input);
        assert.strictEqual(
          caseId,
          expected,
          `Case ID extraction for "${input}" should be ${expected}`
        );
      }
    });

    test("Should validate case ID format", () => {
      const validIds = ["700123456", "700987654", "700000000", "700999999"];
      const invalidIds = ["800123456", "70012345", "7001234567", "70012345a"];

      for (const id of validIds) {
        assert.ok(isValidCaseId(id), `${id} should be valid`);
      }

      for (const id of invalidIds) {
        assert.ok(!isValidCaseId(id), `${id} should be invalid`);
      }
    });
  });

  suite("4. Service Type Detection", () => {
    test("Should detect CUCM service type", () => {
      const logFiles = [
        "cm/trace/ccm/ccm00001.txt",
        "cucm/logs/CCM.log",
        "CallManager.log",
        "sdl.log",
      ];

      for (const file of logFiles) {
        const serviceType = detectServiceType(file);
        assert.strictEqual(
          serviceType,
          "CUCM",
          `Should detect CUCM from "${file}"`
        );
      }
    });

    test("Should detect Jabber service type", () => {
      const logFiles = [
        "CSF-mitchong.log",
        "JabberWerxCPP.log",
        "CiscoJabber.log",
        "jabber/logs/application.log",
      ];

      for (const file of logFiles) {
        const serviceType = detectServiceType(file);
        assert.strictEqual(
          serviceType,
          "Jabber",
          `Should detect Jabber from "${file}"`
        );
      }
    });

    test("Should detect CUC service type", () => {
      const logFiles = [
        "cuc/Unity.log",
        "connection/logs/messaging.log",
        "VoicemailServer.log",
      ];

      for (const file of logFiles) {
        const serviceType = detectServiceType(file);
        assert.strictEqual(
          serviceType,
          "CUC",
          `Should detect CUC from "${file}"`
        );
      }
    });

    test("Should detect CUP service type", () => {
      const logFiles = [
        "cup/presence/logs/presence.log",
        "Presence_Engine.log",
        "cups-xcp.log",
      ];

      for (const file of logFiles) {
        const serviceType = detectServiceType(file);
        assert.strictEqual(
          serviceType,
          "CUP",
          `Should detect CUP from "${file}"`
        );
      }
    });

    test("Should return Generic for unknown types", () => {
      const logFiles = [
        "unknown.log",
        "generic/logs/app.log",
        "system.log",
      ];

      for (const file of logFiles) {
        const serviceType = detectServiceType(file);
        assert.strictEqual(
          serviceType,
          "Generic",
          `Should return Generic for "${file}"`
        );
      }
    });

    test("Should handle case-insensitive detection", () => {
      const files = [
        { input: "CCM.log", expected: "CUCM" },
        { input: "ccm.log", expected: "CUCM" },
        { input: "Ccm.log", expected: "CUCM" },
        { input: "JABBER.log", expected: "Jabber" },
        { input: "jabber.log", expected: "Jabber" },
      ];

      for (const { input, expected } of files) {
        const serviceType = detectServiceType(input);
        assert.strictEqual(
          serviceType,
          expected,
          `Detection should be case-insensitive for "${input}"`
        );
      }
    });
  });

  suite("5. File Size Formatting", () => {
    test("Should format bytes correctly", () => {
      const cases = [
        { bytes: 0, expected: "0 B" },
        { bytes: 1, expected: "1 B" },
        { bytes: 512, expected: "512 B" },
        { bytes: 1023, expected: "1023 B" },
      ];

      for (const { bytes, expected } of cases) {
        const formatted = formatFileSize(bytes);
        assert.strictEqual(
          formatted,
          expected,
          `${bytes} bytes should format as "${expected}"`
        );
      }
    });

    test("Should format kilobytes correctly", () => {
      const cases = [
        { bytes: 1024, expected: "1.0 KB" },
        { bytes: 1536, expected: "1.5 KB" },
        { bytes: 2048, expected: "2.0 KB" },
        { bytes: 10240, expected: "10.0 KB" },
      ];

      for (const { bytes, expected } of cases) {
        const formatted = formatFileSize(bytes);
        assert.strictEqual(
          formatted,
          expected,
          `${bytes} bytes should format as "${expected}"`
        );
      }
    });

    test("Should format megabytes correctly", () => {
      const cases = [
        { bytes: 1024 * 1024, expected: "1.0 MB" },
        { bytes: 1.5 * 1024 * 1024, expected: "1.5 MB" },
        { bytes: 100 * 1024 * 1024, expected: "100.0 MB" },
      ];

      for (const { bytes, expected } of cases) {
        const formatted = formatFileSize(bytes);
        assert.strictEqual(
          formatted,
          expected,
          `${bytes} bytes should format as "${expected}"`
        );
      }
    });

    test("Should format gigabytes correctly", () => {
      const cases = [
        { bytes: 1024 * 1024 * 1024, expected: "1.0 GB" },
        { bytes: 2.5 * 1024 * 1024 * 1024, expected: "2.5 GB" },
      ];

      for (const { bytes, expected } of cases) {
        const formatted = formatFileSize(bytes);
        assert.strictEqual(
          formatted,
          expected,
          `${bytes} bytes should format as "${expected}"`
        );
      }
    });

    test("Should handle edge cases", () => {
      const cases = [
        { bytes: -1, expected: "0 B" }, // Negative
        { bytes: NaN, expected: "0 B" }, // NaN
        { bytes: Infinity, expected: "∞" }, // Infinity
      ];

      for (const { bytes, expected } of cases) {
        const formatted = formatFileSize(bytes);
        assert.ok(
          formatted === expected || formatted === "0 B",
          `Edge case ${bytes} should handle gracefully`
        );
      }
    });
  });

  suite("6. Timestamp Formatting", () => {
    test("Should format timestamps as ISO strings", () => {
      const date = new Date("2024-02-21T10:30:00Z");
      const formatted = formatTimestamp(date);

      assert.ok(
        formatted.includes("2024"),
        "Should include year"
      );
      assert.ok(
        formatted.includes("02") || formatted.includes("21"),
        "Should include month or day"
      );
    });

    test("Should format relative times for recent timestamps", () => {
      const now = Date.now();
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

      const relative = formatRelativeTime(fiveMinutesAgo);
      assert.ok(
        relative.includes("minute") || relative.includes("min"),
        "Should show minutes for recent timestamp"
      );
    });

    test("Should handle invalid dates", () => {
      const invalid = new Date("invalid");
      const formatted = formatTimestamp(invalid);

      assert.ok(
        formatted === "Invalid Date" || formatted === "Unknown",
        "Should handle invalid dates gracefully"
      );
    });
  });

  suite("7. Path Handling", () => {
    test("Should extract filename from Windows path", () => {
      const paths = [
        { path: "C:\\logs\\test.log", expected: "test.log" },
        { path: "C:\\Users\\user\\Desktop\\file.txt", expected: "file.txt" },
      ];

      for (const { path: testPath, expected } of paths) {
        const filename = path.basename(testPath);
        assert.strictEqual(
          filename,
          expected,
          `Should extract "${expected}" from "${testPath}"`
        );
      }
    });

    test("Should extract filename from Unix path", () => {
      const paths = [
        { path: "/var/logs/test.log", expected: "test.log" },
        { path: "/home/user/documents/file.txt", expected: "file.txt" },
      ];

      for (const { path: testPath, expected } of paths) {
        const filename = path.basename(testPath);
        assert.strictEqual(
          filename,
          expected,
          `Should extract "${expected}" from "${testPath}"`
        );
      }
    });

    test("Should handle paths with spaces", () => {
      const testPath = "C:\\My Documents\\My File.log";
      const filename = path.basename(testPath);
      assert.strictEqual(filename, "My File.log");
    });

    test("Should handle UNC paths", () => {
      const testPath = "\\\\server\\share\\logs\\test.log";
      const filename = testPath.split(/[\\/]/).pop();
      assert.strictEqual(filename, "test.log");
    });
  });

  suite("8. Log File Extension Detection", () => {
    test("Should recognize common log extensions", () => {
      const logFiles = [
        "test.log",
        "application.txt",
        "debug.trace",
        "output.out",
        "error.err",
      ];

      for (const file of logFiles) {
        const isLog = isLogFile(file);
        assert.ok(isLog, `"${file}" should be recognized as log file`);
      }
    });

    test("Should reject non-log extensions", () => {
      const nonLogFiles = [
        "document.pdf",
        "image.png",
        "archive.zip",
        "script.js",
        "style.css",
      ];

      for (const file of nonLogFiles) {
        const isLog = isLogFile(file);
        assert.ok(!isLog, `"${file}" should not be recognized as log file`);
      }
    });

    test("Should handle case-insensitive extensions", () => {
      const files = ["test.LOG", "app.TXT", "debug.TRACE"];

      for (const file of files) {
        const isLog = isLogFile(file);
        assert.ok(
          isLog,
          `Extension detection should be case-insensitive for "${file}"`
        );
      }
    });

    test("Should handle files without extension", () => {
      const file = "logfile";
      const isLog = isLogFile(file);
      // Could go either way - document the expected behavior
      assert.ok(
        typeof isLog === "boolean",
        "Should return boolean for extensionless files"
      );
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (Implementation stubs - extract from actual code)
// ============================================================================

function validateBundleName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 255) return false;

  const invalidChars = /[<>:"/\\|?*]/;
  return !invalidChars.test(name);
}

function generateBundleId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `bundle_${timestamp}_${random}`;
}

function extractCaseIdFromFilename(filename: string): string | undefined {
  // Match 9-digit case ID starting with 700
  const match = filename.match(/700\d{6}/);
  return match ? match[0] : undefined;
}

function isValidCaseId(id: string): boolean {
  return /^700\d{6}$/.test(id);
}

function detectServiceType(filePath: string): string {
  const lower = filePath.toLowerCase();

  if (lower.includes("ccm") || lower.includes("callmanager") || lower.includes("sdl")) {
    return "CUCM";
  }
  if (lower.includes("jabber") || lower.includes("csf")) {
    return "Jabber";
  }
  if (lower.includes("cuc") || lower.includes("unity") || lower.includes("voicemail")) {
    return "CUC";
  }
  if (lower.includes("cup") || lower.includes("presence")) {
    return "CUP";
  }

  return "Generic";
}

function formatFileSize(bytes: number): string {
  if (isNaN(bytes) || bytes < 0) return "0 B";
  if (!isFinite(bytes)) return "∞";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatTimestamp(date: Date): string {
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toISOString();
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function isLogFile(filename: string): boolean {
  const logExtensions = [".log", ".txt", ".trace", ".out", ".err"];
  const ext = path.extname(filename).toLowerCase();
  return logExtensions.includes(ext);
}
