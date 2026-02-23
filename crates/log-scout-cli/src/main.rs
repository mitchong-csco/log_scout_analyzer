use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use colored::*;
use pattern_engine::cause_codes::CauseCodeRegistry;
use std::process;

mod call_flow;

/// Log Scout Analyzer - Command Line Interface
///
/// Tools for analyzing Cisco UC logs, translating cause codes, and more.
#[derive(Parser)]
#[command(name = "log-scout")]
#[command(author = "Log Scout Team")]
#[command(version)]
#[command(about = "Cisco UC log analysis tools", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Translate Cisco cause codes to human-readable descriptions
    ///
    /// Supports multiple vendors: UCM, UCCX, CVP, ACS, UCCE
    ///
    /// Examples:
    ///   log-scout cause-code --vendor ucm --code 16
    ///   log-scout cause-code -v uccx -c 1
    ///   log-scout cause-code --vendor ucm --search busy
    ///   log-scout cause-code --vendor ucm --list
    CauseCode {
        /// Vendor/product (ucm, uccx, cvp, acs, ucce)
        #[arg(short, long, value_name = "VENDOR")]
        vendor: String,

        /// Cause code number to translate
        #[arg(short, long, value_name = "CODE", conflicts_with = "search")]
        code: Option<u32>,

        /// Search for codes by description
        #[arg(short, long, value_name = "QUERY", conflicts_with = "code")]
        search: Option<String>,

        /// List all available cause codes for the vendor
        #[arg(short, long, conflicts_with_all = ["code", "search"])]
        list: bool,

        /// Show extended descriptions (full text)
        #[arg(short = 'e', long)]
        extended: bool,
    },

    /// Analyze SIP call flows from CTRACE logs
    ///
    /// Parse Cisco UCM Call Trace (CTRACE) logs and visualize call flows
    /// as ASCII ladder diagrams with timing information.
    ///
    /// Examples:
    ///   log-scout call-flow list bundle.zip
    ///   log-scout call-flow show 001a2f8d-f17f0004 --bundle bundle.zip
    ///   log-scout call-flow analyze bundle.zip
    ///   log-scout call-flow export 001a2f8d-f17f0004 --output flow.md
    #[command(subcommand)]
    CallFlow(CallFlowCommands),
}

#[derive(Subcommand)]
enum CallFlowCommands {
    /// List all call sessions in a bundle or directory
    ///
    /// Scans CTRACE logs and displays a summary of all detected call sessions
    /// with their Call-IDs, message counts, states, and durations.
    ///
    /// Example:
    ///   log-scout call-flow list bundle.zip
    ///   log-scout call-flow list /path/to/logs/
    List {
        /// Path to bundle file (.zip) or directory containing CTRACE logs
        #[arg(value_name = "PATH")]
        path: std::path::PathBuf,
    },

    /// Show a specific call flow diagram
    ///
    /// Displays an ASCII ladder diagram for a specific call session.
    /// The diagram shows the SIP message exchange between endpoints
    /// with timestamps and state information.
    ///
    /// Example:
    ///   log-scout call-flow show 001a2f8d-f17f0004 --bundle bundle.zip
    ///   log-scout call-flow show 001a2f8d-f17f0004 --format plain
    Show {
        /// Call-ID (GUID) of the call session to display
        #[arg(value_name = "CALL_ID")]
        call_id: String,

        /// Path to bundle file or directory containing CTRACE logs
        #[arg(short, long, value_name = "PATH")]
        bundle: Option<std::path::PathBuf>,

        /// Output format: markdown (default) or plain
        #[arg(short, long, value_name = "FORMAT", default_value = "markdown")]
        format: String,
    },

    /// Analyze all call flows in a bundle
    ///
    /// Processes all CTRACE logs in a bundle and displays diagrams
    /// for all detected call sessions.
    ///
    /// Example:
    ///   log-scout call-flow analyze bundle.zip
    ///   log-scout call-flow analyze /path/to/logs/ --format plain
    Analyze {
        /// Path to bundle file (.zip) or directory containing CTRACE logs
        #[arg(value_name = "PATH")]
        path: std::path::PathBuf,

        /// Output format: markdown (default) or plain
        #[arg(short, long, value_name = "FORMAT", default_value = "markdown")]
        format: String,

        /// Maximum number of call flows to display
        #[arg(short = 'n', long, value_name = "COUNT")]
        limit: Option<usize>,
    },

    /// Export a call flow diagram to a file
    ///
    /// Exports a specific call flow diagram to a Markdown or plain text file.
    ///
    /// Example:
    ///   log-scout call-flow export 001a2f8d-f17f0004 --output flow.md
    ///   log-scout call-flow export 001a2f8d-f17f0004 -o flow.txt --format plain
    Export {
        /// Call-ID (GUID) of the call session to export
        #[arg(value_name = "CALL_ID")]
        call_id: String,

        /// Output file path
        #[arg(short, long, value_name = "FILE")]
        output: std::path::PathBuf,

        /// Path to bundle file or directory containing CTRACE logs
        #[arg(short, long, value_name = "PATH")]
        bundle: Option<std::path::PathBuf>,

        /// Output format: markdown (default) or plain
        #[arg(short, long, value_name = "FORMAT", default_value = "markdown")]
        format: String,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::CauseCode {
            vendor,
            code,
            search,
            list,
            extended,
        } => handle_cause_code(&vendor, code, search, list, extended),
        Commands::CallFlow(cmd) => handle_call_flow(cmd),
    };

    if let Err(e) = result {
        eprintln!("{} {}", "Error:".red().bold(), e);
        process::exit(1);
    }
}

fn handle_cause_code(
    vendor: &str,
    code: Option<u32>,
    search: Option<String>,
    list: bool,
    extended: bool,
) -> Result<()> {
    // Create and load registry
    let registry = CauseCodeRegistry::new();

    registry
        .load_vendor(vendor)
        .with_context(|| format!("Failed to load cause codes for vendor '{}'", vendor))?;

    let vendor_upper = vendor.to_uppercase();

    // Handle different command modes
    if let Some(code_num) = code {
        // Single code lookup
        handle_single_code(&registry, vendor, &vendor_upper, code_num, extended)
    } else if let Some(query) = search {
        // Search mode
        handle_search(&registry, vendor, &vendor_upper, &query, extended)
    } else if list {
        // List all codes
        handle_list(&registry, vendor, &vendor_upper, extended)
    } else {
        // No operation specified
        anyhow::bail!(
            "Please specify --code, --search, or --list\n\
             Example: log-scout cause-code --vendor ucm --code 16"
        );
    }
}

fn handle_single_code(
    registry: &CauseCodeRegistry,
    vendor: &str,
    vendor_upper: &str,
    code: u32,
    extended: bool,
) -> Result<()> {
    match registry.translate(vendor, code) {
        Some(description) => {
            println!("{} {}", "Vendor:".cyan().bold(), vendor_upper);
            println!("{} {}", "Code:".cyan().bold(), code);
            println!();

            if extended {
                println!("{}", description);
            } else {
                // Truncate long descriptions
                let display_desc = truncate_description(&description, 120);
                println!("{}", display_desc);

                if description.len() > 120 {
                    println!();
                    println!("{}", "💡 Use --extended to see full description".dimmed());
                }
            }
            Ok(())
        }
        None => {
            anyhow::bail!(
                "Cause code {} not found for vendor {}\n\
                 Use --list to see all available codes",
                code,
                vendor_upper
            );
        }
    }
}

fn handle_search(
    registry: &CauseCodeRegistry,
    vendor: &str,
    vendor_upper: &str,
    query: &str,
    extended: bool,
) -> Result<()> {
    let results = registry.search(vendor, query);

    if results.is_empty() {
        println!(
            "{} No cause codes found matching '{}' for vendor {}",
            "ℹ".cyan(),
            query.yellow(),
            vendor_upper
        );
        return Ok(());
    }

    println!(
        "{} Found {} matching cause code(s) in {}:",
        "✓".green().bold(),
        results.len(),
        vendor_upper
    );
    println!("{}", "─".repeat(80).dimmed());

    for (code, description) in &results {
        print!("{:>6} ", code.to_string().yellow().bold());

        if extended {
            println!("{}", description);
        } else {
            let display_desc = truncate_description(&description, 100);
            println!("{}", display_desc);
        }
    }

    if !extended && results.iter().any(|(_, desc)| desc.len() > 100) {
        println!();
        println!("{}", "💡 Use --extended to see full descriptions".dimmed());
    }

    Ok(())
}

fn handle_list(
    registry: &CauseCodeRegistry,
    vendor: &str,
    vendor_upper: &str,
    extended: bool,
) -> Result<()> {
    let all_codes = registry
        .get_all_codes(vendor)
        .context("Failed to retrieve cause codes")?;

    println!(
        "{} {} Cause Codes ({} total):",
        "📋".to_string(),
        vendor_upper,
        all_codes.len()
    );
    println!("{}", "═".repeat(80).dimmed());

    // Sort codes for display
    let mut sorted_codes: Vec<_> = all_codes.iter().collect();
    sorted_codes.sort_by_key(|(code, _)| *code);

    for (code, description) in sorted_codes {
        print!("{:>6} ", code.to_string().yellow().bold());

        if extended {
            println!("{}", description);
        } else {
            let display_desc = truncate_description(description, 100);
            println!("{}", display_desc);
        }
    }

    println!("{}", "─".repeat(80).dimmed());
    println!(
        "{} Use {} to translate a specific code",
        "💡".to_string().dimmed(),
        "--code <number>".cyan()
    );

    if !extended {
        println!(
            "{} Use {} to see full descriptions",
            "💡".to_string().dimmed(),
            "--extended".cyan()
        );
    }

    Ok(())
}

fn truncate_description(desc: &str, max_len: usize) -> String {
    if desc.len() <= max_len {
        desc.to_string()
    } else {
        // Find a good break point (space) near max_len
        let truncate_at = desc[..max_len].rfind(' ').unwrap_or(max_len);
        format!("{}...", &desc[..truncate_at])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_description() {
        let short = "Short description";
        assert_eq!(truncate_description(short, 100), short);

        let long = "This is a very long description that needs to be truncated because it exceeds the maximum length allowed for display in the terminal";
        let truncated = truncate_description(long, 50);
        assert!(truncated.len() <= 53); // 50 + "..."
        assert!(truncated.ends_with("..."));
    }

    #[test]
    fn verify_cli() {
        use clap::CommandFactory;
        Cli::command().debug_assert();
    }
}

// ============================================================================
// Call Flow Command Handlers
// ============================================================================

fn handle_call_flow(cmd: CallFlowCommands) -> Result<()> {
    match cmd {
        CallFlowCommands::List { path } => handle_call_flow_list(path),
        CallFlowCommands::Show {
            call_id,
            bundle,
            format,
        } => handle_call_flow_show(&call_id, bundle, &format),
        CallFlowCommands::Analyze {
            path,
            format,
            limit,
        } => handle_call_flow_analyze(path, &format, limit),
        CallFlowCommands::Export {
            call_id,
            output,
            bundle,
            format,
        } => handle_call_flow_export(&call_id, output, bundle, &format),
    }
}

fn handle_call_flow_list(path: std::path::PathBuf) -> Result<()> {
    call_flow::list_call_flows(path)
}

fn handle_call_flow_show(
    call_id: &str,
    bundle: Option<std::path::PathBuf>,
    format: &str,
) -> Result<()> {
    call_flow::show_call_flow(call_id, bundle, format)
}

fn handle_call_flow_analyze(
    path: std::path::PathBuf,
    format: &str,
    limit: Option<usize>,
) -> Result<()> {
    call_flow::analyze_call_flows(path, format, limit)
}

fn handle_call_flow_export(
    call_id: &str,
    output: std::path::PathBuf,
    bundle: Option<std::path::PathBuf>,
    format: &str,
) -> Result<()> {
    call_flow::export_call_flow(call_id, output, bundle, format)
}
