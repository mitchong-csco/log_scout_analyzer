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
            command: "".to_string(),
            args: vec![],
            env: Default::default(),
        })
    }
}

zed::register_extension!(LogScoutAnalyzerExtension);
