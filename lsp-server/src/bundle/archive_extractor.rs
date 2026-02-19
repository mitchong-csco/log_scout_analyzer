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
