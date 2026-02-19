//! Service detection for log files
//!
//! Automatically detects which service a log file belongs to based on
//! filename patterns and content signatures.
//!
//! ## Detection Methods
//!
//! 1. **RTMT Server Node Names** - cucm-pub, cuc01, cup-server, imp01
//! 2. **RTMT XML Metadata** - TODO: Parse RTMT collection job XML files
//! 3. **Archive Names** - webex_diagnostics.zip, jabber_diag.zip
//! 4. **Filename Patterns** - jabber_trace.log, unity_voicemail.log
//! 5. **Content Signatures** - Analyze log content for service keywords

use crate::bundle::{BundleError, Result, ServiceType};
use std::path::Path;

/// Service detector for identifying log file sources
pub struct ServiceDetector;

impl ServiceDetector {
    /// Create a new service detector
    pub fn new() -> Self {
        Self
    }

    /// Detect service type from RTMT XML collection job metadata
    ///
    /// RTMT provides XML files with collection job information that contains
    /// definitive service identification. This is the most accurate detection method.
    ///
    /// # TODO
    /// - Parse RTMT XML files when sample is provided
    /// - Extract server node information
    /// - Extract service component names
    /// - Extract cluster configuration
    ///
    /// # XML File Examples (to be implemented)
    /// - `rtmt_collection_job.xml`
    /// - `collection_metadata.xml`
    /// - Service-specific collection XMLs
    ///
    /// # Arguments
    /// * `xml_content` - The XML file content
    ///
    /// # Returns
    /// Service type if detected from XML, or None
    pub fn from_rtmt_xml(&self, _xml_content: &str) -> Option<ServiceType> {
        // TODO: Implement XML parsing when sample is provided
        // This will be the most accurate detection method as RTMT
        // explicitly includes service information in XML metadata

        tracing::info!("RTMT XML parsing not yet implemented - awaiting sample XML");
        None
    }

    /// Detect service type from archive filename
    ///
    /// Many diagnostic tools (Webex, Jabber) create archives with specific naming patterns.
    /// This provides strong hints about the service type before even extracting.
    ///
    /// # Examples
    /// - `webex_diagnostics_2026-02-18.zip` → Webex
    /// - `jabber_diag_20260218_143022.zip` → Jabber
    /// - `CiscoJabber_Diagnostics_2026.02.18.tar.gz` → Jabber
    /// - `webex-logs-user@example.com-2026-02-18.zip` → Webex
    ///
    /// # Arguments
    /// * `archive_name` - The filename of the archive (not full path)
    pub fn from_archive_name(&self, archive_name: &str) -> Option<ServiceType> {
        let lower = archive_name.to_lowercase();

        // Webex diagnostic patterns
        if lower.contains("webex") && (lower.contains("diag") || lower.contains("log")) {
            return Some(ServiceType::Webex);
        }
        if lower.starts_with("webex-") || lower.starts_with("webex_") {
            return Some(ServiceType::Webex);
        }
        if lower.contains("webexteams") || lower.contains("webex_teams") {
            return Some(ServiceType::Webex);
        }

        // Jabber diagnostic patterns
        if lower.contains("jabber") && (lower.contains("diag") || lower.contains("log")) {
            return Some(ServiceType::Jabber);
        }
        if lower.contains("ciscojabber") || lower.contains("cisco_jabber") {
            return Some(ServiceType::Jabber);
        }
        if lower.starts_with("jabber-") || lower.starts_with("jabber_") {
            return Some(ServiceType::Jabber);
        }

        // CUCM diagnostic patterns
        if lower.contains("cucm") && (lower.contains("diag") || lower.contains("trace")) {
            return Some(ServiceType::CUCM);
        }
        if lower.contains("callmanager") || lower.contains("call_manager") {
            return Some(ServiceType::CUCM);
        }

        // CUP diagnostic patterns
        if lower.contains("presence") && lower.contains("diag") {
            return Some(ServiceType::CUP);
        }
        if lower.contains("cup_") || lower.contains("cup-") {
            return Some(ServiceType::CUP);
        }

        // Unity diagnostic patterns
        if lower.contains("unity") && lower.contains("diag") {
            return Some(ServiceType::Unity);
        }
        if lower.contains("voicemail") || lower.contains("vm_diag") {
            return Some(ServiceType::Unity);
        }

        // SIP traces
        if lower.contains("sip_trace") || lower.contains("siptrace") {
            return Some(ServiceType::SIP);
        }
        if lower.ends_with("_sip.zip") || lower.ends_with("-sip.tar.gz") {
            return Some(ServiceType::SIP);
        }

        None
    }

    /// Detect service type from filename (fast path)
    ///
    /// This is the primary detection method as it's fast and accurate
    /// for well-named log files.
    ///
    /// # Examples
    /// ```
    /// use lsp_server::bundle::ServiceDetector;
    ///
    /// let detector = ServiceDetector::new();
    /// let service = detector.from_filename("jabber_trace.log");
    /// ```
    pub fn from_filename(&self, path: &str) -> Option<ServiceType> {
        let lower = path.to_lowercase();

        // RTMT server node name patterns (customer often uses these acronyms)
        // Examples: cucm-pub.log, ucm-sub.log, cuc01.log, imp-server.log
        if self.is_rtmt_cucm_pattern(&lower) {
            return Some(ServiceType::CUCM);
        }
        if self.is_rtmt_cuc_pattern(&lower) {
            return Some(ServiceType::Unity);
        }
        if self.is_rtmt_cup_imp_pattern(&lower) {
            return Some(ServiceType::CUP);
        }

        // Jabber detection
        if lower.contains("jabber") || lower.contains("jabberd") {
            return Some(ServiceType::Jabber);
        }

        // CUCM (Cisco Unified Communications Manager)
        if lower.contains("cucm")
            || lower.contains("callmanager")
            || lower.contains("call_manager")
            || lower.contains("cm_trace")
        {
            return Some(ServiceType::CUCM);
        }

        // CUP (Cisco Unified Presence)
        if lower.contains("cup") || lower.contains("presence") || lower.contains("xcp") {
            return Some(ServiceType::CUP);
        }

        // Unity (Voicemail)
        if lower.contains("unity") || lower.contains("voicemail") || lower.contains("vm_") {
            return Some(ServiceType::Unity);
        }

        // SIP traces
        if lower.contains("sip") || lower.contains("ladder") || lower.ends_with(".sdl") {
            return Some(ServiceType::SIP);
        }

        // Network logs
        if lower.contains("network")
            || lower.contains("pcap")
            || lower.contains("wireshark")
            || lower.contains("tcpdump")
        {
            return Some(ServiceType::Network);
        }

        None
    }

    /// Check if filename matches RTMT CUCM/UCM server node patterns
    ///
    /// RTMT exports often use server hostnames like:
    /// - cucm-pub.log, cucm01.log, cucm-sub.log
    /// - ucm-pub.log, ucm01.log, ucm-server.log
    fn is_rtmt_cucm_pattern(&self, filename: &str) -> bool {
        // Check for CUCM/UCM at start of filename (RTMT server node names)
        if filename.starts_with("cucm") || filename.starts_with("ucm") {
            // Common patterns: cucm-pub, cucm01, cucm_server, etc.
            let rest = if filename.starts_with("cucm") {
                &filename[4..]
            } else {
                &filename[3..]
            };

            // Followed by: -, _, digit, or .
            if rest.starts_with('-')
                || rest.starts_with('_')
                || rest.starts_with('.')
                || rest.chars().next().map_or(false, |c| c.is_ascii_digit())
            {
                return true;
            }
        }
        false
    }

    /// Check if filename matches RTMT CUC server node patterns
    ///
    /// RTMT exports for Unity Connection often use:
    /// - cuc-pub.log, cuc01.log, cuc-server.log
    fn is_rtmt_cuc_pattern(&self, filename: &str) -> bool {
        if filename.starts_with("cuc") && filename.len() > 3 {
            let rest = &filename[3..];
            // Followed by: -, _, digit, or .
            if rest.starts_with('-')
                || rest.starts_with('_')
                || rest.starts_with('.')
                || rest.chars().next().map_or(false, |c| c.is_ascii_digit())
            {
                return true;
            }
        }
        false
    }

    /// Check if filename matches RTMT CUP/IMP server node patterns
    ///
    /// RTMT exports for Presence often use:
    /// - cup-pub.log, cup01.log, cup-server.log
    /// - imp-pub.log, imp01.log, imp-server.log
    fn is_rtmt_cup_imp_pattern(&self, filename: &str) -> bool {
        // Check CUP pattern
        if filename.starts_with("cup") && filename.len() > 3 {
            let rest = &filename[3..];
            if rest.starts_with('-')
                || rest.starts_with('_')
                || rest.starts_with('.')
                || rest.chars().next().map_or(false, |c| c.is_ascii_digit())
            {
                return true;
            }
        }

        // Check IMP pattern
        if filename.starts_with("imp") && filename.len() > 3 {
            let rest = &filename[3..];
            if rest.starts_with('-')
                || rest.starts_with('_')
                || rest.starts_with('.')
                || rest.chars().next().map_or(false, |c| c.is_ascii_digit())
            {
                return true;
            }
        }

        false
    }

    /// Detect service type from log content
    ///
    /// Examines the first N lines of a log file to identify service signatures.
    /// This is slower but more accurate for files without clear naming.
    ///
    /// # Arguments
    /// * `content_lines` - First 50-100 lines of the log file
    pub fn from_content(&self, content_lines: &[String]) -> Option<ServiceType> {
        if content_lines.is_empty() {
            return None;
        }

        let mut scores = ServiceScores::default();

        // Analyze each line for signatures
        for line in content_lines.iter().take(50) {
            let lower = line.to_lowercase();

            // Jabber signatures
            if lower.contains("cisco jabber")
                || lower.contains("com.cisco.jabber")
                || lower.contains("jabberversion")
                || lower.contains("jabberwer")
            {
                scores.jabber += 3;
            }

            // CUCM signatures
            if lower.contains("unified communications manager")
                || lower.contains("cucm")
                || lower.contains("callmanager")
                || lower.contains("cisco.ccm")
                || lower.contains("sdl_ccm")
            {
                scores.cucm += 3;
            }

            // CUP signatures
            if lower.contains("cisco unified presence")
                || lower.contains("presence engine")
                || lower.contains("xcp_")
                || lower.contains("cupserver")
            {
                scores.cup += 3;
            }

            // Unity signatures
            if lower.contains("cisco unity")
                || lower.contains("voicemessage")
                || lower.contains("umserviceport")
                || lower.contains("unity connection")
            {
                scores.unity += 3;
            }

            // SIP signatures
            if lower.contains("via: sip/2.0")
                || lower.contains("invite sip:")
                || lower.contains("register sip:")
                || lower.contains("from: <sip:")
            {
                scores.sip += 2;
            }

            // Network signatures
            if lower.contains("tcp")
                || lower.contains("udp")
                || lower.contains("icmp")
                || lower.contains("packet")
            {
                scores.network += 1; // Lower score, these are common
            }
        }

        scores.get_highest()
    }

    /// Detect service with both filename and content
    ///
    /// This is the recommended method - tries filename first (fast),
    /// falls back to content analysis if needed.
    ///
    /// # Arguments
    /// * `path` - File path or URI
    /// * `content_lines` - First 50-100 lines of content (optional for performance)
    pub fn detect(&self, path: &str, content_lines: Option<&[String]>) -> Result<ServiceType> {
        // Try filename first (fast path)
        if let Some(service) = self.from_filename(path) {
            tracing::debug!("Detected {} from filename: {}", service, path);
            return Ok(service);
        }

        // Try content if available
        if let Some(lines) = content_lines {
            if let Some(service) = self.from_content(lines) {
                tracing::debug!("Detected {} from content: {}", service, path);
                return Ok(service);
            }
        }

        // Default to custom with filename
        let filename = Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        tracing::warn!("Could not detect service for: {}, using Custom", path);
        Ok(ServiceType::Custom(filename.to_string()))
    }

    /// Get detection confidence (0.0 - 1.0)
    ///
    /// Returns how confident the detector is about the service type
    pub fn confidence(&self, path: &str, content_lines: Option<&[String]>) -> f32 {
        // Filename match = high confidence
        if self.from_filename(path).is_some() {
            return 0.95;
        }

        // Content match = medium-high confidence
        if let Some(lines) = content_lines {
            if self.from_content(lines).is_some() {
                return 0.85;
            }
        }

        // No match = low confidence (using Custom)
        0.3
    }
}

impl Default for ServiceDetector {
    fn default() -> Self {
        Self::new()
    }
}

/// Scoring for content-based detection
#[derive(Default)]
struct ServiceScores {
    jabber: u32,
    cucm: u32,
    cup: u32,
    unity: u32,
    sip: u32,
    network: u32,
}

impl ServiceScores {
    /// Get the service with the highest score
    fn get_highest(&self) -> Option<ServiceType> {
        let mut max_score = 0;
        let mut best_service = None;

        if self.jabber > max_score {
            max_score = self.jabber;
            best_service = Some(ServiceType::Jabber);
        }

        if self.cucm > max_score {
            max_score = self.cucm;
            best_service = Some(ServiceType::CUCM);
        }

        if self.cup > max_score {
            max_score = self.cup;
            best_service = Some(ServiceType::CUP);
        }

        if self.unity > max_score {
            max_score = self.unity;
            best_service = Some(ServiceType::Unity);
        }

        if self.sip > max_score {
            max_score = self.sip;
            best_service = Some(ServiceType::SIP);
        }

        if self.network > max_score {
            max_score = self.network;
            best_service = Some(ServiceType::Network);
        }

        // Only return if score is meaningful (threshold: 2)
        if max_score >= 2 {
            best_service
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filename_detection_jabber() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("jabber_trace.log"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            detector.from_filename("/logs/Jabber-2026-02-18.log"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            detector.from_filename("JABBERD.LOG"),
            Some(ServiceType::Jabber)
        );
    }

    #[test]
    fn test_filename_detection_cucm() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("cucm_trace.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("CallManager.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("cm_trace_001.txt"),
            Some(ServiceType::CUCM)
        );
    }

    #[test]
    fn test_filename_detection_cup() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("cup_trace.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            detector.from_filename("presence_server.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            detector.from_filename("xcp_router.log"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_filename_detection_unity() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("unity_trace.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("voicemail.log"),
            Some(ServiceType::Unity)
        );
    }

    #[test]
    fn test_filename_detection_sip() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("sip_trace.log"),
            Some(ServiceType::SIP)
        );
        assert_eq!(detector.from_filename("ladder.sdl"), Some(ServiceType::SIP));
    }

    #[test]
    fn test_filename_detection_network() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_filename("network_capture.pcap"),
            Some(ServiceType::Network)
        );
        assert_eq!(
            detector.from_filename("wireshark_trace.log"),
            Some(ServiceType::Network)
        );
    }

    #[test]
    fn test_filename_detection_none() {
        let detector = ServiceDetector::new();

        assert_eq!(detector.from_filename("generic.log"), None);
        assert_eq!(detector.from_filename("application.txt"), None);
    }

    #[test]
    fn test_content_detection_jabber() {
        let detector = ServiceDetector::new();
        let content = vec![
            "Starting Cisco Jabber client".to_string(),
            "Version: 12.9.0".to_string(),
            "com.cisco.jabber.main initialized".to_string(),
        ];

        assert_eq!(detector.from_content(&content), Some(ServiceType::Jabber));
    }

    #[test]
    fn test_content_detection_cucm() {
        let detector = ServiceDetector::new();
        let content = vec![
            "Unified Communications Manager".to_string(),
            "CUCM Version 14.0".to_string(),
            "CallManager service starting".to_string(),
        ];

        assert_eq!(detector.from_content(&content), Some(ServiceType::CUCM));
    }

    #[test]
    fn test_content_detection_sip() {
        let detector = ServiceDetector::new();
        let content = vec![
            "INVITE sip:user@domain.com SIP/2.0".to_string(),
            "Via: SIP/2.0/UDP 10.0.0.1:5060".to_string(),
            "From: <sip:caller@example.com>".to_string(),
        ];

        assert_eq!(detector.from_content(&content), Some(ServiceType::SIP));
    }

    #[test]
    fn test_content_detection_none() {
        let detector = ServiceDetector::new();
        let content = vec![
            "Generic application log".to_string(),
            "No specific service signatures".to_string(),
        ];

        assert_eq!(detector.from_content(&content), None);
    }

    #[test]
    fn test_detect_with_filename() {
        let detector = ServiceDetector::new();

        let result = detector.detect("jabber_trace.log", None).unwrap();
        assert_eq!(result, ServiceType::Jabber);
    }

    #[test]
    fn test_detect_with_content_fallback() {
        let detector = ServiceDetector::new();
        let content = vec!["Cisco Unified Communications Manager".to_string()];

        let result = detector.detect("generic.log", Some(&content)).unwrap();
        assert_eq!(result, ServiceType::CUCM);
    }

    #[test]
    fn test_detect_custom_fallback() {
        let detector = ServiceDetector::new();

        let result = detector.detect("unknown.log", None).unwrap();
        match result {
            ServiceType::Custom(name) => assert_eq!(name, "unknown.log"),
            _ => panic!("Expected Custom service type"),
        }
    }

    #[test]
    fn test_confidence_high() {
        let detector = ServiceDetector::new();

        let conf = detector.confidence("jabber_trace.log", None);
        assert!(conf >= 0.9, "Filename match should have high confidence");
    }

    #[test]
    fn test_confidence_medium() {
        let detector = ServiceDetector::new();
        let content = vec!["Cisco Jabber".to_string()];

        let conf = detector.confidence("generic.log", Some(&content));
        assert!(
            conf >= 0.8 && conf < 0.95,
            "Content match should have medium-high confidence"
        );
    }

    #[test]
    fn test_confidence_low() {
        let detector = ServiceDetector::new();

        let conf = detector.confidence("unknown.log", None);
        assert!(conf < 0.5, "No match should have low confidence");
    }

    #[test]
    fn test_case_insensitive() {
        let detector = ServiceDetector::new();

        // All caps
        assert_eq!(
            detector.from_filename("JABBER_TRACE.LOG"),
            Some(ServiceType::Jabber)
        );

        // Mixed case
        assert_eq!(
            detector.from_filename("Jabber_Trace.Log"),
            Some(ServiceType::Jabber)
        );
    }

    #[test]
    fn test_path_components() {
        let detector = ServiceDetector::new();

        // Path with jabber in directory
        assert_eq!(
            detector.from_filename("/var/log/jabber/trace.log"),
            Some(ServiceType::Jabber)
        );

        // Windows path
        assert_eq!(
            detector.from_filename("C:\\Logs\\CUCM\\trace.txt"),
            Some(ServiceType::CUCM)
        );
    }
}

#[cfg(test)]
mod archive_name_tests {
    use super::*;

    #[test]
    fn test_webex_diagnostic_archives() {
        let detector = ServiceDetector::new();

        // Webex diagnostic patterns
        assert_eq!(
            detector.from_archive_name("webex_diagnostics_2026-02-18.zip"),
            Some(ServiceType::Webex)
        );
        assert_eq!(
            detector.from_archive_name("webex-logs-user@example.com-2026-02-18.zip"),
            Some(ServiceType::Webex)
        );
        assert_eq!(
            detector.from_archive_name("WebexTeams_Logs.tar.gz"),
            Some(ServiceType::Webex)
        );
        assert_eq!(
            detector.from_archive_name("webex_diag_20260218.zip"),
            Some(ServiceType::Webex)
        );
    }

    #[test]
    fn test_jabber_diagnostic_archives() {
        let detector = ServiceDetector::new();

        // Jabber diagnostic patterns
        assert_eq!(
            detector.from_archive_name("jabber_diag_20260218_143022.zip"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            detector.from_archive_name("CiscoJabber_Diagnostics_2026.02.18.tar.gz"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            detector.from_archive_name("jabber-logs-2026-02-18.zip"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            detector.from_archive_name("Jabber_Diagnostic_Log.zip"),
            Some(ServiceType::Jabber)
        );
    }

    #[test]
    fn test_cucm_diagnostic_archives() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_archive_name("cucm_diagnostic_trace.tar.gz"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_archive_name("CallManager_Logs.zip"),
            Some(ServiceType::CUCM)
        );
    }

    #[test]
    fn test_cup_diagnostic_archives() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_archive_name("presence_diag_2026.zip"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            detector.from_archive_name("cup_logs_2026-02-18.tar.gz"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_unity_diagnostic_archives() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_archive_name("unity_diag_20260218.zip"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_archive_name("voicemail_logs.tar.gz"),
            Some(ServiceType::Unity)
        );
    }

    #[test]
    fn test_sip_trace_archives() {
        let detector = ServiceDetector::new();

        assert_eq!(
            detector.from_archive_name("sip_trace_2026-02-18.zip"),
            Some(ServiceType::SIP)
        );
        assert_eq!(
            detector.from_archive_name("call_trace_sip.tar.gz"),
            Some(ServiceType::SIP)
        );
    }

    #[test]
    fn test_unknown_archives() {
        let detector = ServiceDetector::new();

        // Generic archive names should return None
        assert_eq!(detector.from_archive_name("logs.zip"), None);
        assert_eq!(detector.from_archive_name("backup_2026-02-18.tar.gz"), None);
        assert_eq!(detector.from_archive_name("data.zip"), None);
    }

    #[test]
    fn test_qcsone_archives() {
        let detector = ServiceDetector::new();

        // QCSONE archives don't indicate service type from name alone
        assert_eq!(
            detector.from_archive_name("700440257_qcsone_download_selected.zip"),
            None
        );
    }
}

#[cfg(test)]
mod rtmt_pattern_tests {
    use super::*;

    #[test]
    fn test_rtmt_cucm_patterns() {
        let detector = ServiceDetector::new();

        // CUCM server node name patterns
        assert_eq!(
            detector.from_filename("cucm-pub.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("cucm-sub.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("cucm01.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("cucm_server.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(detector.from_filename("cucm.log"), Some(ServiceType::CUCM));
    }

    #[test]
    fn test_rtmt_ucm_patterns() {
        let detector = ServiceDetector::new();

        // UCM server node name patterns
        assert_eq!(
            detector.from_filename("ucm-pub.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("ucm-sub.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(detector.from_filename("ucm01.log"), Some(ServiceType::CUCM));
        assert_eq!(
            detector.from_filename("ucm_server.log"),
            Some(ServiceType::CUCM)
        );
    }

    #[test]
    fn test_rtmt_cuc_patterns() {
        let detector = ServiceDetector::new();

        // CUC (Unity Connection) server node name patterns
        assert_eq!(
            detector.from_filename("cuc-pub.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("cuc-sub.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("cuc01.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("cuc_server.log"),
            Some(ServiceType::Unity)
        );
    }

    #[test]
    fn test_rtmt_cup_patterns() {
        let detector = ServiceDetector::new();

        // CUP (Presence) server node name patterns
        assert_eq!(
            detector.from_filename("cup-pub.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            detector.from_filename("cup-sub.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(detector.from_filename("cup01.log"), Some(ServiceType::CUP));
        assert_eq!(
            detector.from_filename("cup_server.log"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_rtmt_imp_patterns() {
        let detector = ServiceDetector::new();

        // IMP (Instant Messaging and Presence) server node name patterns
        assert_eq!(
            detector.from_filename("imp-pub.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            detector.from_filename("imp-sub.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(detector.from_filename("imp01.log"), Some(ServiceType::CUP));
        assert_eq!(
            detector.from_filename("imp_server.log"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_rtmt_common_naming_patterns() {
        let detector = ServiceDetector::new();

        // Common RTMT export patterns with full paths
        assert_eq!(
            detector.from_filename("/var/log/cucm-pub_trace.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("C:\\Logs\\cuc01_syslog.txt"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("cup-server_debug.log"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_not_rtmt_patterns() {
        let detector = ServiceDetector::new();

        // Should NOT match these (not RTMT patterns)
        assert_eq!(detector.from_filename("cucumber.log"), None);
        assert_eq!(detector.from_filename("document.txt"), None);
        // "cup" in middle of word shouldn't match
        assert_eq!(detector.from_filename("backup_cupboard.log"), None);
    }

    #[test]
    fn test_rtmt_with_timestamps() {
        let detector = ServiceDetector::new();

        // RTMT exports often include timestamps
        assert_eq!(
            detector.from_filename("cucm-pub_2026-02-18_14-30-00.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            detector.from_filename("cuc01_20260218.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            detector.from_filename("imp-server_2026_02_18.log"),
            Some(ServiceType::CUP)
        );
    }
}
