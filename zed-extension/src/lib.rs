use zed_extension_api::{self as zed, LanguageServerId, Result, Worktree};

struct LogScoutAnalyzerExtension;

impl zed::Extension for LogScoutAnalyzerExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        _worktree: &Worktree,
    ) -> Result<zed::Command> {
        Ok(zed::Command {
            command: resolve_lsp_command(),
            args: vec![],
            env: Default::default(),
        })
    }
}

fn resolve_lsp_command() -> String {
    if let Ok(path) = std::env::var("LOG_SCOUT_LSP_PATH") {
        return path;
    }

    if let Ok(ext_dir) = std::env::var("ZED_EXTENSION_DIR") {
        let bin_name = match std::env::consts::OS {
            "windows" => "log-scout-lsp-server-win.exe",
            "macos" => "log-scout-lsp-server-mac",
            _ => "log-scout-lsp-server-linux",
        };
        let path = std::path::PathBuf::from(ext_dir)
            .join("bin")
            .join(bin_name);
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    // Fallback to PATH lookup.
    "log-scout-lsp-server".to_string()
}

zed::register_extension!(LogScoutAnalyzerExtension);
