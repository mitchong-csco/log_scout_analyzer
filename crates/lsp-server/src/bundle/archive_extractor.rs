//! Archive extraction for log bundles
//!
//! Automatically extracts common archive formats from QCSONE and other sources
//! with configurable file type filtering.

use crate::bundle::{BundleError, ExtractionDecision, ExtractionPolicy, Result};
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};

/// Archive format detection
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArchiveFormat {
    Zip,
    TarGz,
    Tar,
    Gz,
    Unknown,
}

impl ArchiveFormat {
    /// Detect format from file extension
    pub fn from_path(path: &Path) -> Self {
        let path_str = path.to_string_lossy().to_lowercase();

        if path_str.ends_with(".zip") {
            ArchiveFormat::Zip
        } else if path_str.ends_with(".tar.gz") || path_str.ends_with(".tgz") {
            ArchiveFormat::TarGz
        } else if path_str.ends_with(".tar") {
            ArchiveFormat::Tar
        } else if path_str.ends_with(".gz") {
            ArchiveFormat::Gz
        } else {
            ArchiveFormat::Unknown
        }
    }

    /// Check if path is an archive
    pub fn is_archive(path: &Path) -> bool {
        !matches!(Self::from_path(path), ArchiveFormat::Unknown)
    }
}

/// Archive extractor with configurable extraction policy
pub struct ArchiveExtractor {
    policy: ExtractionPolicy,
}

impl ArchiveExtractor {
    /// Create new extractor with default policy
    pub fn new() -> Self {
        Self {
            policy: ExtractionPolicy::load_or_default(),
        }
    }

    /// Create extractor with custom policy
    pub fn with_policy(policy: ExtractionPolicy) -> Self {
        Self { policy }
    }

    /// Extract archive to destination directory (static method for compatibility)
    ///
    /// Returns list of extracted log files
    ///
    /// **Supports nested archives** - will recursively extract archives found within archives
    pub fn extract(archive_path: &Path, dest_dir: &Path) -> Result<Vec<PathBuf>> {
        let extractor = Self::new();
        extractor.extract_impl(archive_path, dest_dir, 0)
    }

    /// Extract with custom policy
    pub fn extract_with_custom_policy(
        archive_path: &Path,
        dest_dir: &Path,
        policy: ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        let extractor = Self::with_policy(policy);
        extractor.extract_impl(archive_path, dest_dir, 0)
    }

    /// Extract archive with depth tracking (internal use)
    fn extract_impl(
        &self,
        archive_path: &Path,
        dest_dir: &Path,
        depth: usize,
    ) -> Result<Vec<PathBuf>> {
        Self::extract_with_depth_and_policy(archive_path, dest_dir, depth, &self.policy)
    }

    /// Extract archive with depth tracking and policy (internal)
    fn extract_with_depth_and_policy(
        archive_path: &Path,
        dest_dir: &Path,
        depth: usize,
        policy: &ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        const MAX_DEPTH: usize = 5;

        if depth > MAX_DEPTH {
            tracing::warn!(
                "Maximum nesting depth {} reached for: {}",
                MAX_DEPTH,
                archive_path.display()
            );
            return Ok(Vec::new());
        }

        // Apply policy overrides based on archive name
        let archive_name = archive_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        let policy = policy.for_archive(archive_name);

        let format = ArchiveFormat::from_path(archive_path);

        tracing::info!(
            "Extracting {:?} archive (depth {}): {}",
            format,
            depth,
            archive_path.display()
        );

        match format {
            ArchiveFormat::Zip => Self::extract_zip(archive_path, dest_dir, depth, &policy),
            ArchiveFormat::TarGz => Self::extract_tar_gz(archive_path, dest_dir, depth, &policy),
            ArchiveFormat::Tar => Self::extract_tar(archive_path, dest_dir, depth, &policy),
            ArchiveFormat::Gz => Self::extract_gz(archive_path, dest_dir),
            ArchiveFormat::Unknown => Err(BundleError::Invalid(format!(
                "Unsupported archive format: {}",
                archive_path.display()
            ))),
        }
    }

    /// Extract ZIP archive
    fn extract_zip(
        archive_path: &Path,
        dest_dir: &Path,
        depth: usize,
        policy: &ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        use zip::ZipArchive;

        let file = File::open(archive_path)?;
        let mut archive = ZipArchive::new(file)
            .map_err(|e| BundleError::Invalid(format!("Invalid ZIP: {}", e)))?;

        let mut extracted_files = Vec::new();

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| BundleError::Invalid(format!("ZIP error: {}", e)))?;

            let outpath = dest_dir.join(file.name());

            if file.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                // Check if we should extract this file
                let size = file.size();
                match policy.should_extract_file(&outpath, size) {
                    ExtractionDecision::Extract => {
                        // Extract the file
                        if let Some(parent) = outpath.parent() {
                            fs::create_dir_all(parent)?;
                        }

                        let mut outfile = File::create(&outpath)?;
                        io::copy(&mut file, &mut outfile)?;

                        // Check if extracted file is itself an archive
                        if ArchiveFormat::is_archive(&outpath) {
                            tracing::info!("Found nested archive: {}", outpath.display());

                            // Create subdirectory for nested archive extraction
                            let nested_dir = dest_dir.join(
                                outpath
                                    .file_stem()
                                    .unwrap_or_else(|| std::ffi::OsStr::new("nested")),
                            );
                            fs::create_dir_all(&nested_dir)?;

                            // Recursively extract nested archive
                            match Self::extract_with_depth_and_policy(
                                &outpath,
                                &nested_dir,
                                depth + 1,
                                policy,
                            ) {
                                Ok(nested_files) => {
                                    extracted_files.extend(nested_files);
                                    tracing::info!(
                                        "Extracted {} files from nested archive",
                                        extracted_files.len()
                                    );
                                }
                                Err(e) => {
                                    tracing::warn!(
                                        "Failed to extract nested archive {}: {}",
                                        outpath.display(),
                                        e
                                    );
                                }
                            }
                        } else if Self::is_log_file(&outpath) {
                            // Only track log files
                            extracted_files.push(outpath);
                        }
                    }
                    ExtractionDecision::SkipExecutable => {
                        if policy.options.log_skipped_files {
                            tracing::debug!(
                                "Skipping executable: {} (security filter)",
                                outpath.display()
                            );
                        }
                    }
                    ExtractionDecision::SkipImage => {
                        if policy.options.log_skipped_files {
                            tracing::debug!("Skipping image: {} (not useful)", outpath.display());
                        }
                    }
                    ExtractionDecision::SkipVideo => {
                        if policy.options.log_skipped_files {
                            tracing::debug!("Skipping video: {} (not useful)", outpath.display());
                        }
                    }
                    ExtractionDecision::SkipTooLarge(bytes) => {
                        if policy.options.warn_on_large_files {
                            tracing::warn!(
                                "Skipping large file: {} ({} MB)",
                                outpath.display(),
                                bytes / 1024 / 1024
                            );
                        }
                    }
                    ExtractionDecision::SkipUnwantedType => {
                        if policy.options.log_skipped_files {
                            tracing::debug!("Skipping unwanted file type: {}", outpath.display());
                        }
                    }
                }
            }
        }

        tracing::info!("Extracted {} log files from ZIP", extracted_files.len());
        Ok(extracted_files)
    }

    /// Extract TAR.GZ archive
    fn extract_tar_gz(
        archive_path: &Path,
        dest_dir: &Path,
        depth: usize,
        policy: &ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        use flate2::read::GzDecoder;
        use tar::Archive;

        let file = File::open(archive_path)?;
        let gz = GzDecoder::new(file);
        let mut archive = Archive::new(gz);

        archive
            .unpack(dest_dir)
            .map_err(|e| BundleError::Invalid(format!("TAR.GZ error: {}", e)))?;

        // Find extracted log files and process nested archives
        let extracted_files = Self::find_and_extract_nested(dest_dir, depth, policy)?;

        tracing::info!("Extracted {} log files from TAR.GZ", extracted_files.len());
        Ok(extracted_files)
    }

    /// Extract TAR archive
    fn extract_tar(
        archive_path: &Path,
        dest_dir: &Path,
        depth: usize,
        policy: &ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        use tar::Archive;

        let file = File::open(archive_path)?;
        let mut archive = Archive::new(file);

        archive
            .unpack(dest_dir)
            .map_err(|e| BundleError::Invalid(format!("TAR error: {}", e)))?;

        // Find extracted log files and process nested archives
        let extracted_files = Self::find_and_extract_nested(dest_dir, depth, policy)?;

        tracing::info!("Extracted {} log files from TAR", extracted_files.len());
        Ok(extracted_files)
    }

    /// Extract single GZ file
    fn extract_gz(archive_path: &Path, dest_dir: &Path) -> Result<Vec<PathBuf>> {
        use flate2::read::GzDecoder;

        let file = File::open(archive_path)?;
        let mut gz = GzDecoder::new(file);

        // Output filename: remove .gz extension
        let filename = archive_path
            .file_stem()
            .ok_or_else(|| BundleError::Invalid("Invalid filename".to_string()))?;
        let outpath = dest_dir.join(filename);

        let mut outfile = File::create(&outpath)?;
        io::copy(&mut gz, &mut outfile)?;

        let extracted_files = if Self::is_log_file(&outpath) {
            vec![outpath]
        } else {
            vec![]
        };

        tracing::info!("Extracted GZ file");
        Ok(extracted_files)
    }

    /// Check if file is a log file or RTMT metadata file
    fn is_log_file(path: &Path) -> bool {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        matches!(
            ext.as_str(),
            "log" | "txt" | "trace" | "out" | "err" | "xml" // XML for RTMT metadata
        )
    }

    /// Recursively find log files in directory
    fn find_log_files(dir: &Path) -> Result<Vec<PathBuf>> {
        let mut log_files = Vec::new();

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                log_files.extend(Self::find_log_files(&path)?);
            } else if Self::is_log_file(&path) {
                log_files.push(path);
            }
        }

        Ok(log_files)
    }

    /// Find log files and recursively extract nested archives
    fn find_and_extract_nested(
        dir: &Path,
        depth: usize,
        policy: &ExtractionPolicy,
    ) -> Result<Vec<PathBuf>> {
        let mut log_files = Vec::new();

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // Recurse into subdirectories
                log_files.extend(Self::find_and_extract_nested(&path, depth, policy)?);
            } else if ArchiveFormat::is_archive(&path) {
                // Found nested archive - extract it
                tracing::info!("Found nested archive: {}", path.display());

                let nested_dir = dir.join(
                    path.file_stem()
                        .unwrap_or_else(|| std::ffi::OsStr::new("nested")),
                );
                fs::create_dir_all(&nested_dir)?;

                match Self::extract_with_depth_and_policy(&path, &nested_dir, depth + 1, policy) {
                    Ok(nested_files) => {
                        log_files.extend(nested_files);
                        tracing::info!("Extracted {} files from nested archive", log_files.len());
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Failed to extract nested archive {}: {}",
                            path.display(),
                            e
                        );
                    }
                }
            } else if Self::is_log_file(&path) {
                // Regular log file
                log_files.push(path);
            }
        }

        Ok(log_files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_format_detection() {
        assert_eq!(
            ArchiveFormat::from_path(Path::new("700440257_qcsone_download_selected.zip")),
            ArchiveFormat::Zip
        );
        assert_eq!(
            ArchiveFormat::from_path(Path::new("logs.tar.gz")),
            ArchiveFormat::TarGz
        );
        assert_eq!(
            ArchiveFormat::from_path(Path::new("logs.tgz")),
            ArchiveFormat::TarGz
        );
        assert_eq!(
            ArchiveFormat::from_path(Path::new("logs.tar")),
            ArchiveFormat::Tar
        );
    }

    #[test]
    fn test_is_archive() {
        assert!(ArchiveFormat::is_archive(Path::new(
            "700440257_qcsone_download_selected.zip"
        )));
        assert!(ArchiveFormat::is_archive(Path::new("logs.tar.gz")));
        assert!(!ArchiveFormat::is_archive(Path::new("logs.log")));
    }

    #[test]
    fn test_is_log_file() {
        assert!(ArchiveExtractor::is_log_file(Path::new("jabber.log")));
        assert!(ArchiveExtractor::is_log_file(Path::new("cucm.txt")));
        assert!(ArchiveExtractor::is_log_file(Path::new("trace.trace")));
        assert!(!ArchiveExtractor::is_log_file(Path::new("config.xml")));
    }
}
