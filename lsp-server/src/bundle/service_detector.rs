//! Service type detection from log files
//!
//! Automatically detects the service type from filename and content signatures

use super::models::{LogType, ServiceType};

pub struct ServiceDetector;

impl ServiceDetector {
    /// Detect service type from filename and optionally file content
    pub fn detect(filename: &str, content: Option<&str>) -> ServiceType {
        // First try filename detection (fast path)
        if let Some(service) = Self::detect_from_filename(filename) {
            return service;
        }

        // Fall back to content detection if available
        if let Some(content) = content {
            if let Some(service) = Self::detect_from_content(content) {
                return service;
            }
        }

        // Default to custom with filename
        ServiceType::Custom(filename.to_string())
    }

    /// Detect from filename patterns
    pub fn detect_from_filename(filename: &str) -> Option<ServiceType> {
        let lower = filename.to_lowercase();

        // Jabber patterns
        if lower.contains("jabber") {
            return Some(ServiceType::Jabber);
        }

        // CUCM patterns
        if lower.contains("cucm")
            || lower.contains("cm_")
            || lower.contains("callmanager")
            || lower.contains("ccm")
        {
            return Some(ServiceType::CUCM);
        }

        // CUP patterns
        if lower.contains("cup") || lower.contains("presence") {
            return Some(ServiceType::CUP);
        }

        // Unity patterns
        if lower.contains("unity") || lower.contains("voicemail") {
            return Some(ServiceType::Unity);
        }

        // SIP patterns
        if lower.contains("sip") || lower.contains("pcap") || lower.contains("trace") {
            return Some(ServiceType::SIP);
        }

        // Network patterns
        if lower.contains("network") || lower.contains("packet") {
            return Some(ServiceType::Network);
        }

        None
    }

    /// Detect from content signatures
    pub fn detect_from_content(content: &str) -> Option<ServiceType> {
        // Read first 500 characters to avoid scanning entire file
        let header = content.lines().take(50).collect::<Vec<_>>().join("\n");

        // Jabber signatures
        if header.contains("Jabber") || header.contains("CSF") || header.contains("Cisco Jabber") {
            return Some(ServiceType::Jabber);
        }

        // CUCM signatures
        if header.contains("CallManager")
            || header.contains("CCM")
            || header.contains("CUCM")
            || header.contains("Unified Communications Manager")
        {
            return Some(ServiceType::CUCM);
        }

        // CUP signatures
        if header.contains("Presence") || header.contains("XCP") || header.contains("CUP") {
            return Some(ServiceType::CUP);
        }

        // Unity signatures
        if header.contains("Unity") || header.contains("Voicemail") {
            return Some(ServiceType::Unity);
        }

        // SIP signatures
        if header.contains("SIP/2.0") || header.contains("Via:") || header.contains("From:") {
            return Some(ServiceType::SIP);
        }

        None
    }

    /// Detect log type from content
    pub fn detect_log_type(content: &str) -> LogType {
        let header = content.lines().take(20).collect::<Vec<_>>().join("\n");

        if header.to_lowercase().contains("trace") {
            LogType::Trace
        } else if header.to_lowercase().contains("debug") {
            LogType::Debug
        } else if header.to_lowercase().contains("error") {
            LogType::Error
        } else if header.to_lowercase().contains("warning") {
            LogType::Warning
        } else if header.to_lowercase().contains("audit") {
            LogType::Audit
        } else if header.to_lowercase().contains("cdr") {
            LogType::CDR
        } else if header.to_lowercase().contains("activity") {
            LogType::Activity
        } else {
            LogType::Debug
        }
    }

    /// Detect timestamp format (basic heuristic)
    pub fn detect_timestamp_format(content: &str) -> Option<String> {
        for line in content.lines().take(100) {
            // Common timestamp patterns
            if let Some(format) = Self::extract_timestamp_format(line) {
                return Some(format);
            }
        }
        None
    }

    fn extract_timestamp_format(line: &str) -> Option<String> {
        // YYYY-MM-DD HH:mm:ss,SSS
        if line.contains("-") && line.contains(":") {
            // Timestamp-like pattern detected
            return Some("YYYY-MM-DD HH:mm:ss,SSS".to_string());
        }

        // MM/DD/YYYY HH:mm:ss.SSS
        if line.contains("/") && line.contains(":") {
            return Some("MM/DD/YYYY HH:mm:ss.SSS".to_string());
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_jabber() {
        assert_eq!(
            ServiceDetector::detect_from_filename("Jabber.log"),
            Some(ServiceType::Jabber)
        );
        assert_eq!(
            ServiceDetector::detect_from_filename("jabber_trace.log"),
            Some(ServiceType::Jabber)
        );
    }

    #[test]
    fn test_detect_cucm() {
        assert_eq!(
            ServiceDetector::detect_from_filename("CUCM_trace.log"),
            Some(ServiceType::CUCM)
        );
        assert_eq!(
            ServiceDetector::detect_from_filename("cm_platform.log"),
            Some(ServiceType::CUCM)
        );
    }

    #[test]
    fn test_detect_cup() {
        assert_eq!(
            ServiceDetector::detect_from_filename("CUP_service.log"),
            Some(ServiceType::CUP)
        );
        assert_eq!(
            ServiceDetector::detect_from_filename("presence.log"),
            Some(ServiceType::CUP)
        );
    }

    #[test]
    fn test_detect_unity() {
        assert_eq!(
            ServiceDetector::detect_from_filename("Unity.log"),
            Some(ServiceType::Unity)
        );
        assert_eq!(
            ServiceDetector::detect_from_filename("voicemail_trace.log"),
            Some(ServiceType::Unity)
        );
    }

    #[test]
    fn test_content_detection() {
        let jabber_content = "Cisco Jabber client trace\nLine 2\n";
        assert_eq!(
            ServiceDetector::detect_from_content(jabber_content),
            Some(ServiceType::Jabber)
        );

        let sip_content = "SIP/2.0 200 OK\nVia: SIP/2.0/UDP\n";
        assert_eq!(
            ServiceDetector::detect_from_content(sip_content),
            Some(ServiceType::SIP)
        );
    }
}
