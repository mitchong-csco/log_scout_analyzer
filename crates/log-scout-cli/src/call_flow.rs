//! Call Flow Analysis Commands
//!
//! This module implements CLI commands for analyzing SIP call flows from CTRACE logs.
//! It provides functionality to list, show, analyze, and export call flow diagrams.

use anyhow::{Context, Result};
use colored::*;
use pattern_engine::call_flow::{
    CallCorrelator, CallSession, CtraceEntry, DiagramFormat, DiagramRenderer, Direction, Transport,
};
use std::fs;
use std::path::{Path, PathBuf};

/// List all call sessions in a bundle or directory
pub fn list_call_flows(path: PathBuf) -> Result<()> {
    println!("{} Scanning for CTRACE logs...", "🔍".to_string());

    let entries = load_ctrace_entries(&path)?;
    let sessions = correlate_calls(entries)?;

    if sessions.is_empty() {
        println!(
            "{} No call sessions found in {}",
            "ℹ".cyan(),
            path.display()
        );
        return Ok(());
    }

    println!();
    println!(
        "{} Found {} call session(s) in {}:",
        "✓".green().bold(),
        sessions.len(),
        path.display()
    );
    println!("{}", "═".repeat(80).dimmed());

    for (i, session) in sessions.iter().enumerate() {
        let state_emoji = match session.state.as_str() {
            "Terminated" => "✅",
            "Ringing" => "🔔",
            "Trying" => "📞",
            "Failed" => "❌",
            "Established" => "📞",
            _ => "❓",
        };

        let duration = if let Some(total) = session.timings.total_duration {
            format!("{:.1}s", total.as_secs_f64())
        } else {
            "N/A".to_string()
        };

        println!(
            "{:>3}. {} {} ({} messages, {} {}, {})",
            i + 1,
            state_emoji,
            session.call_id.cyan().bold(),
            session.message_count().to_string().yellow(),
            session.state.as_str().dimmed(),
            state_emoji,
            duration.dimmed()
        );
    }

    println!("{}", "─".repeat(80).dimmed());
    println!(
        "{} Use {} to see a specific call flow",
        "💡".to_string().dimmed(),
        "log-scout call-flow show <CALL_ID>".cyan()
    );

    Ok(())
}

/// Show a specific call flow diagram
pub fn show_call_flow(call_id: &str, bundle: Option<PathBuf>, format: &str) -> Result<()> {
    let path = bundle
        .as_ref()
        .context("Bundle path is required. Use --bundle <PATH>")?;

    println!(
        "{} Loading call flow for {}...",
        "🔍".to_string(),
        call_id.cyan()
    );

    let entries = load_ctrace_entries(path)?;
    let sessions = correlate_calls(entries)?;

    // Find the session by Call-ID
    let session = sessions
        .iter()
        .find(|s| s.call_id.starts_with(call_id) || s.call_id.contains(call_id))
        .context(format!(
            "Call session '{}' not found. Use 'log-scout call-flow list' to see available calls.",
            call_id
        ))?;

    let diagram_format = parse_format(format)?;
    let renderer = DiagramRenderer::new();
    let diagram = renderer.render(session, diagram_format);

    println!();
    println!("{}", diagram);

    Ok(())
}

/// Analyze all call flows in a bundle
pub fn analyze_call_flows(path: PathBuf, format: &str, limit: Option<usize>) -> Result<()> {
    println!("{} Analyzing call flows...", "🔍".to_string());

    let entries = load_ctrace_entries(&path)?;
    let sessions = correlate_calls(entries)?;

    if sessions.is_empty() {
        println!(
            "{} No call sessions found in {}",
            "ℹ".cyan(),
            path.display()
        );
        return Ok(());
    }

    let diagram_format = parse_format(format)?;
    let renderer = DiagramRenderer::new();

    let sessions_to_display = if let Some(n) = limit {
        &sessions[..n.min(sessions.len())]
    } else {
        &sessions
    };

    println!();
    println!(
        "{} Displaying {} of {} call session(s):",
        "✓".green().bold(),
        sessions_to_display.len(),
        sessions.len()
    );
    println!("{}", "═".repeat(80).dimmed());

    for (i, session) in sessions_to_display.iter().enumerate() {
        if i > 0 {
            println!();
            println!("{}", "═".repeat(80).dimmed());
            println!();
        }

        let diagram = renderer.render(session, diagram_format);
        println!("{}", diagram);
    }

    if let Some(n) = limit {
        if sessions.len() > n {
            println!();
            println!(
                "{} Showing {} of {} calls. Remove --limit to see all.",
                "ℹ".cyan(),
                n,
                sessions.len()
            );
        }
    }

    Ok(())
}

/// Export a call flow diagram to a file
pub fn export_call_flow(
    call_id: &str,
    output: PathBuf,
    bundle: Option<PathBuf>,
    format: &str,
) -> Result<()> {
    let path = bundle
        .as_ref()
        .context("Bundle path is required. Use --bundle <PATH>")?;

    println!(
        "{} Exporting call flow for {}...",
        "📤".to_string(),
        call_id.cyan()
    );

    let entries = load_ctrace_entries(path)?;
    let sessions = correlate_calls(entries)?;

    // Find the session by Call-ID
    let session = sessions
        .iter()
        .find(|s| s.call_id.starts_with(call_id) || s.call_id.contains(call_id))
        .context(format!(
            "Call session '{}' not found. Use 'log-scout call-flow list' to see available calls.",
            call_id
        ))?;

    let diagram_format = parse_format(format)?;
    let renderer = DiagramRenderer::new();
    let diagram = renderer.render(session, diagram_format);

    // Write to file
    fs::write(&output, diagram).context(format!("Failed to write to {}", output.display()))?;

    println!(
        "{} Call flow exported to {}",
        "✅".to_string(),
        output.display().to_string().green()
    );

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Load CTRACE entries from a path (file or directory)
fn load_ctrace_entries(path: &Path) -> Result<Vec<CtraceEntry>> {
    let mut entries = Vec::new();

    if path.is_file() {
        // Single file
        let content =
            fs::read_to_string(path).context(format!("Failed to read file: {}", path.display()))?;
        entries.extend(parse_ctrace_content(&content)?);
    } else if path.is_dir() {
        // Directory - scan for CTRACE files
        let dir_entries =
            fs::read_dir(path).context(format!("Failed to read directory: {}", path.display()))?;

        for entry in dir_entries {
            let entry = entry?;
            let file_path = entry.path();

            if file_path.is_file() {
                if let Some(content) = try_read_ctrace_file(&file_path)? {
                    entries.extend(parse_ctrace_content(&content)?);
                }
            }
        }
    } else {
        anyhow::bail!("Path is neither a file nor a directory: {}", path.display());
    }

    if entries.is_empty() {
        anyhow::bail!("No valid CTRACE entries found in {}", path.display());
    }

    Ok(entries)
}

/// Try to read a file as CTRACE log (returns None if not a CTRACE file)
fn try_read_ctrace_file(path: &Path) -> Result<Option<String>> {
    // Check file extension or name patterns
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        if name.contains("ctrace") || name.contains("CTRACE") || name.ends_with(".ctrace") {
            let content = fs::read_to_string(path)
                .context(format!("Failed to read file: {}", path.display()))?;
            return Ok(Some(content));
        }
    }

    Ok(None)
}

/// Parse CTRACE content into entries
fn parse_ctrace_content(content: &str) -> Result<Vec<CtraceEntry>> {
    let mut entries = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Ok(entry) = parse_ctrace_line(line) {
            entries.push(entry);
        }
    }

    Ok(entries)
}

/// Parse a single CTRACE line
fn parse_ctrace_line(line: &str) -> Result<CtraceEntry> {
    let parts: Vec<&str> = line.split('|').collect();

    if parts.len() != 14 {
        anyhow::bail!(
            "Invalid CTRACE format: expected 14 fields, found {}",
            parts.len()
        );
    }

    // Parse timestamp: yyyy/MM/dd HH:mm:ss.SSS
    let timestamp_str = parts[0].replace(':', ".");
    let timestamp = chrono::NaiveDateTime::parse_from_str(&timestamp_str, "%Y/%m/%d %H.%M.%S%.3f")
        .context("Failed to parse timestamp")?;
    let timestamp =
        chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(timestamp, chrono::Utc);

    // Parse transport
    let transport = Transport::from_str(parts[3]);

    // Parse direction
    let direction = match parts[4] {
        "IN" => Direction::In,
        "OUT" => Direction::Out,
        _ => Direction::In, // Default
    };

    Ok(CtraceEntry {
        timestamp,
        service: parts[1].to_string(),
        protocol_num: parts[2].parse().unwrap_or(0),
        transport,
        direction,
        receiver_ip: parts[5].to_string(),
        receiver_port: parts[6].parse().unwrap_or(0),
        mac_address: parts[7].to_string(),
        sender_ip: parts[8].to_string(),
        sender_port: parts[9].parse().unwrap_or(0),
        correlation_id: parts[10].to_string(),
        message_tag: parts[11].to_string(),
        guid: parts[12].to_string(),
        sip_message: parts[13].to_string(),
    })
}

/// Correlate CTRACE entries into call sessions
fn correlate_calls(entries: Vec<CtraceEntry>) -> Result<Vec<CallSession>> {
    let mut correlator = CallCorrelator::new();

    for entry in entries {
        correlator.add_message(entry);
    }

    Ok(correlator.get_sessions())
}

/// Parse format string to DiagramFormat
fn parse_format(format: &str) -> Result<DiagramFormat> {
    match format.to_lowercase().as_str() {
        "markdown" | "md" => Ok(DiagramFormat::Markdown),
        "plain" | "ascii" | "text" => Ok(DiagramFormat::PlainAscii),
        _ => anyhow::bail!("Invalid format '{}'. Use 'markdown' or 'plain'.", format),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_format() {
        assert!(matches!(
            parse_format("markdown").unwrap(),
            DiagramFormat::Markdown
        ));
        assert!(matches!(
            parse_format("md").unwrap(),
            DiagramFormat::Markdown
        ));
        assert!(matches!(
            parse_format("plain").unwrap(),
            DiagramFormat::PlainAscii
        ));
        assert!(matches!(
            parse_format("ascii").unwrap(),
            DiagramFormat::PlainAscii
        ));
        assert!(parse_format("invalid").is_err());
    }

    #[test]
    fn test_parse_ctrace_line() {
        let line = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";
        let entry = parse_ctrace_line(line).unwrap();

        assert_eq!(entry.service, "SIPL");
        assert_eq!(entry.protocol_num, 0);
        assert!(matches!(entry.transport, Transport::Tcp));
        assert!(matches!(entry.direction, Direction::In));
        assert_eq!(entry.receiver_ip, "5.5.5.45");
        assert_eq!(entry.receiver_port, 58096);
        assert_eq!(entry.mac_address, "SEP00000000111G");
        assert_eq!(entry.sender_ip, "5.5.5.240");
        assert_eq!(entry.sender_port, 5060);
        assert_eq!(entry.guid, "001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240");
        assert_eq!(entry.sip_message, "INVITE");
    }

    #[test]
    fn test_parse_ctrace_line_invalid_field_count() {
        let line = "2009/12/17 10:45:00.949|SIPL|0|TCP";
        assert!(parse_ctrace_line(line).is_err());
    }
}
