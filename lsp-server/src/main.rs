//! Log Scout Analyzer - LSP Server
//!
//! Language Server Protocol implementation for log file analysis.
//! Provides pattern matching, diagnostics, and timeline analysis for log files.

use anyhow::Result;
use log_scout_lsp_server::LogScoutServer;
use tower_lsp::{LspService, Server};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging (writes to stderr since stdout is used for LSP)
    tracing_subscriber::registry()
        .with(fmt::layer().with_writer(std::io::stderr))
        .with(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .init();

    tracing::info!(
        "Starting Log Scout LSP Server v{}",
        env!("CARGO_PKG_VERSION")
    );

    // Run server in stdio mode (communicates via stdin/stdout)
    run_stdio_mode().await?;

    Ok(())
}

/// Run server in stdio mode (default for embedded deployment)
async fn run_stdio_mode() -> Result<()> {
    let stdin = tokio::io::stdin();
    let stdout = tokio::io::stdout();

    let (service, socket) = LspService::new(|client| LogScoutServer::new(client));

    tracing::info!("LSP Server running in stdio mode");
    Server::new(stdin, stdout, socket).serve(service).await;

    Ok(())
}
