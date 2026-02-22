//! Archive extraction utilities for bundle import
//!
//! Supports ZIP and TAR archives with nested archive detection and extraction.

use anyhow::{Context, Result};
use std::fs::{self, File};

use std::path::{Path, PathBuf};
use zip::ZipArchive;

/// Archive extractor for QCSONE packages and other log archives
pub struct ArchiveExtractor;

impl ArchiveExtractor {
    /// Extract a ZIP archive to destination directory
    ///
    /// # Arguments
    /// * `archive_path` - Path to the ZIP file
    /// * `dest` - Destination directory
    ///
    /// # Returns
    /// Vector of extracted file paths
    pub fn extract_zip(archive_path: &Path, dest: &Path) -> Result<Vec<PathBuf>> {
        tracing::info!("Extracting ZIP archive: {:?} to {:?}", archive_path, dest);

        let file = File::open(archive_path)
            .with_context(|| format!("Failed to open archive: {:?}", archive_path))?;

        let mut archive = ZipArchive::new(file)
            .with_context(|| format!("Failed to read ZIP archive: {:?}", archive_path))?;

        let mut extracted = Vec::new();

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .with_context(|| format!("Failed to read ZIP entry {}", i))?;

            let outpath = dest.join(file.name());

            if file.is_dir() {
                fs::create_dir_all(&outpath)
                    .with_context(|| format!("Failed to create directory: {:?}", outpath))?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)
                        .with_context(|| format!("Failed to create parent dir: {:?}", parent))?;
                }

                let mut outfile = File::create(&outpath)
                    .with_context(|| format!("Failed to create file: {:?}", outpath))?;

                std::io::copy(&mut file, &mut outfile)
                    .with_context(|| format!("Failed to extract file: {:?}", outpath))?;

                extracted.push(outpath);

                tracing::debug!("Extracted: {:?}", file.name());
            }
        }

        tracing::info!("Extracted {} files from ZIP", extracted.len());
        Ok(extracted)
    }

    /// Extract TAR archive (optionally gzipped)
    ///
    /// # Arguments
    /// * `archive_path` - Path to the TAR/TAR.GZ file
    /// * `dest` - Destination directory
    ///
    /// # Returns
    /// Vector of extracted file paths
    pub fn extract_tar(archive_path: &Path, dest: &Path) -> Result<Vec<PathBuf>> {
        tracing::info!("Extracting TAR archive: {:?} to {:?}", archive_path, dest);

        let file = File::open(archive_path)
            .with_context(|| format!("Failed to open archive: {:?}", archive_path))?;

        let mut extracted = Vec::new();

        // Check if gzipped
        let is_gzipped = archive_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e == "gz" || e == "tgz")
            .unwrap_or(false);

        if is_gzipped {
            let decoder = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(decoder);

            for entry in archive.entries()? {
                let mut entry = entry?;
                let path = entry.path()?;
                let outpath = dest.join(&path);

                entry.unpack(&outpath)?;

                if outpath.is_file() {
                    extracted.push(outpath);
                }
            }
        } else {
            let mut archive = tar::Archive::new(file);

            for entry in archive.entries()? {
                let mut entry = entry?;
                let path = entry.path()?;
                let outpath = dest.join(&path);

                entry.unpack(&outpath)?;

                if outpath.is_file() {
                    extracted.push(outpath);
                }
            }
        }

        tracing::info!("Extracted {} files from TAR", extracted.len());
        Ok(extracted)
    }

    /// Extract any supported archive format
    ///
    /// Automatically detects format based on extension.
    /// Supports nested archives (will recursively extract).
    pub fn extract_archive(archive_path: &Path, dest: &Path) -> Result<Vec<PathBuf>> {
        let extension = archive_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let mut all_extracted = Vec::new();

        let extracted = match extension.to_lowercase().as_str() {
            "zip" => Self::extract_zip(archive_path, dest)?,
            "tar" | "tgz" | "gz" => Self::extract_tar(archive_path, dest)?,
            _ => {
                tracing::warn!("Unsupported archive format: {}", extension);
                return Ok(Vec::new());
            }
        };

        all_extracted.extend(extracted.clone());

        // Check for nested archives and extract them too
        for file in &extracted {
            if let Some(ext) = file.extension().and_then(|e| e.to_str()) {
                if matches!(ext.to_lowercase().as_str(), "zip" | "tar" | "tgz" | "gz") {
                    tracing::info!("Found nested archive: {:?}", file);

                    let nested_dest = file.parent().unwrap_or(dest);
                    if let Ok(nested_files) = Self::extract_archive(file, nested_dest) {
                        all_extracted.extend(nested_files);
                    }
                }
            }
        }

        Ok(all_extracted)
    }

    /// Detect case ID from QCSONE package filename
    ///
    /// QCSONE packages follow the format: 700440257_qcsone_download_selected.zip
    /// This extracts the numeric case ID from the beginning.
    ///
    /// # Arguments
    /// * `filename` - The archive filename
    ///
    /// # Returns
    /// Optional case ID string
    pub fn detect_case_id(filename: &str) -> Option<String> {
        // Remove .zip extension first
        let name_without_ext = filename
            .trim_end_matches(".zip")
            .trim_end_matches(".tar")
            .trim_end_matches(".gz")
            .trim_end_matches(".tgz");

        // Get first part before underscore
        if let Some(first_part) = name_without_ext.split('_').next() {
            // Check if it's all numeric and reasonably long (case IDs are typically 9+ digits)
            if first_part.chars().all(|c| c.is_ascii_digit()) && first_part.len() >= 9 {
                return Some(first_part.to_string());
            }
        }

        None
    }

    /// Filter extracted files to only include log files
    ///
    /// # Arguments
    /// * `files` - List of extracted file paths
    ///
    /// # Returns
    /// Filtered list containing only log files
    pub fn filter_log_files(files: &[PathBuf]) -> Vec<PathBuf> {
        files
            .iter()
            .filter(|path| Self::is_log_file(path))
            .cloned()
            .collect()
    }

    /// Check if a file is a log file based on extension and name
    fn is_log_file(path: &Path) -> bool {
        if let Some(extension) = path.extension().and_then(|e| e.to_str()) {
            matches!(
                extension.to_lowercase().as_str(),
                "log" | "txt" | "out" | "err" | "output" | "trace"
            )
        } else {
            // Check filename patterns for logs without extensions
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                name.contains("log") || name == "syslog" || name.starts_with("messages")
            } else {
                false
            }
        }
    }

    /// Get summary of extraction results
    pub fn summarize_extraction(files: &[PathBuf]) -> ExtractionSummary {
        let log_files = Self::filter_log_files(files);
        let total_size: u64 = log_files
            .iter()
            .filter_map(|p| std::fs::metadata(p).ok())
            .map(|m| m.len())
            .sum();

        ExtractionSummary {
            total_files: files.len(),
            log_files_count: log_files.len(),
            total_size_bytes: total_size,
            log_files,
        }
    }
}

/// Summary of archive extraction
#[derive(Debug, Clone)]
pub struct ExtractionSummary {
    pub total_files: usize,
    pub log_files_count: usize,
    pub total_size_bytes: u64,
    pub log_files: Vec<PathBuf>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_case_id_qcsone() {
        let filename = "700440257_qcsone_download_selected.zip";
        let case_id = ArchiveExtractor::detect_case_id(filename);
        assert_eq!(case_id, Some("700440257".to_string()));
    }

    #[test]
    fn test_detect_case_id_no_match() {
        let filename = "random_file.zip";
        let case_id = ArchiveExtractor::detect_case_id(filename);
        assert_eq!(case_id, None);
    }

    #[test]
    fn test_detect_case_id_short_number() {
        let filename = "123_short.zip";
        let case_id = ArchiveExtractor::detect_case_id(filename);
        assert_eq!(case_id, None); // Too short
    }

    #[test]
    fn test_is_log_file() {
        assert!(ArchiveExtractor::is_log_file(Path::new("test.log")));
        assert!(ArchiveExtractor::is_log_file(Path::new("debug.txt")));
        assert!(ArchiveExtractor::is_log_file(Path::new("output.out")));
        assert!(!ArchiveExtractor::is_log_file(Path::new("data.json")));
        assert!(!ArchiveExtractor::is_log_file(Path::new("config.xml")));
    }

    #[test]
    fn test_filter_log_files() {
        let files = vec![
            PathBuf::from("app.log"),
            PathBuf::from("data.json"),
            PathBuf::from("debug.txt"),
            PathBuf::from("config.xml"),
        ];

        let log_files = ArchiveExtractor::filter_log_files(&files);
        assert_eq!(log_files.len(), 2);
        assert!(log_files.contains(&PathBuf::from("app.log")));
        assert!(log_files.contains(&PathBuf::from("debug.txt")));
    }
}

// Phase 3: Archive Extraction Tests (6 tests)
#[cfg(test)]
mod extraction_tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_extract_zip_creates_files() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let test_zip = PathBuf::from("../test-data/quick-test.zip");

        if !test_zip.exists() {
            eprintln!("Skipping test: {} not found", test_zip.display());
            return;
        }

        // Execute
        let result = ArchiveExtractor::extract_zip(&test_zip, temp_dir.path());

        // Assert
        assert!(result.is_ok(), "ZIP extraction should succeed");
        let extracted = result.unwrap();

        assert!(
            extracted.len() > 0,
            "Should extract at least one file from ZIP"
        );

        // Verify files exist on disk
        for file in &extracted {
            assert!(file.exists(), "Extracted file should exist: {:?}", file);
        }
    }

    #[test]
    fn test_extract_tar_creates_files() {
        // Setup - create a simple TAR for testing if none exists
        let temp_dir = TempDir::new().unwrap();

        // Look for any existing TAR files in test-data
        let test_data_dir = PathBuf::from("../test-data");
        if !test_data_dir.exists() {
            eprintln!("Skipping test: test-data directory not found");
            return;
        }

        // Try to find a .tar or .tar.gz file
        let tar_files: Vec<PathBuf> = std::fs::read_dir(&test_data_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e == "tar" || e == "gz")
                    .unwrap_or(false)
            })
            .collect();

        if tar_files.is_empty() {
            eprintln!("Skipping test: no TAR files found in test-data");
            return;
        }

        let test_tar = &tar_files[0];

        // Execute
        let result = ArchiveExtractor::extract_tar(test_tar, temp_dir.path());

        // Assert
        assert!(result.is_ok(), "TAR extraction should succeed");
        let extracted = result.unwrap();

        assert!(
            extracted.len() > 0,
            "Should extract at least one file from TAR"
        );

        // Verify files exist
        for file in &extracted {
            assert!(file.exists(), "Extracted file should exist: {:?}", file);
        }
    }

    #[test]
    fn test_extract_archive_auto_detects_format() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let test_zip = PathBuf::from("../test-data/quick-test.zip");

        if !test_zip.exists() {
            eprintln!("Skipping test: {} not found", test_zip.display());
            return;
        }

        // Execute - use extract_archive which auto-detects format
        let result = ArchiveExtractor::extract_archive(&test_zip, temp_dir.path());

        // Assert
        assert!(
            result.is_ok(),
            "Archive extraction with auto-detection should succeed"
        );
        let extracted = result.unwrap();

        assert!(
            extracted.len() > 0,
            "Should extract files using auto-detection"
        );
    }

    #[test]
    fn test_extract_handles_nested_directories() {
        // Setup
        let temp_dir = TempDir::new().unwrap();

        // QCSONE archives typically have nested directory structures
        let test_archive = PathBuf::from("../test-data/700440257_qcsone_download_selected.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = ArchiveExtractor::extract_archive(&test_archive, temp_dir.path());

        // Assert
        assert!(result.is_ok(), "Nested directory extraction should succeed");
        let extracted = result.unwrap();

        // Verify we got files (not just directories)
        let file_count = extracted.iter().filter(|p| p.is_file()).count();
        assert!(
            file_count > 0,
            "Should extract actual files, not just directories"
        );

        // Verify nested paths exist
        let has_nested = extracted.iter().any(|p| p.components().count() > 2);
        if has_nested {
            println!("Successfully handled nested directory structure");
        }
    }

    #[test]
    fn test_extract_handles_corrupted_archive() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let test_archive = PathBuf::from("../test-data/invalid-archive.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = ArchiveExtractor::extract_archive(&test_archive, temp_dir.path());

        // Assert - should return error
        assert!(result.is_err(), "Should fail on corrupted archive");

        let err = result.unwrap_err();
        let err_msg = format!("{:?}", err);
        assert!(
            err_msg.contains("Failed") || err_msg.contains("Invalid") || err_msg.contains("Error"),
            "Error should indicate extraction failure: {}",
            err_msg
        );
    }

    #[test]
    fn test_summarize_extraction_calculates_correctly() {
        // Setup - create temp files with known sizes
        let temp_dir = TempDir::new().unwrap();

        let log1 = temp_dir.path().join("app.log");
        let log2 = temp_dir.path().join("debug.txt");
        let json = temp_dir.path().join("data.json");

        // Create files with content
        std::fs::write(&log1, "Log file 1 content").unwrap();
        std::fs::write(&log2, "Log file 2 content that is longer").unwrap();
        std::fs::write(&json, r#"{"key": "value"}"#).unwrap();

        let files = vec![log1.clone(), log2.clone(), json.clone()];

        // Execute
        let summary = ArchiveExtractor::summarize_extraction(&files);

        // Assert
        assert_eq!(summary.total_files, 3, "Should count all files");
        assert_eq!(summary.log_files_count, 2, "Should identify 2 log files");
        assert!(summary.total_size_bytes > 0, "Should calculate total size");

        // Verify log files list
        assert_eq!(summary.log_files.len(), 2);
        assert!(summary.log_files.contains(&log1));
        assert!(summary.log_files.contains(&log2));
        assert!(!summary.log_files.contains(&json));
    }
}
