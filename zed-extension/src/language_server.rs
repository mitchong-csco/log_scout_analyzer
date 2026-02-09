use zed_extension_api::{self as zed, LanguageServerId, Result};

/// Language server implementation for Log Scout Analyzer
/// Provides LSP capabilities for log file analysis
pub struct LogScoutLanguageServer {
    server_id: LanguageServerId,
}

impl LogScoutLanguageServer {
    pub fn new(server_id: LanguageServerId) -> Self {
        Self { server_id }
    }

    /// Initialize the language server
    pub fn initialize(&self) -> Result<()> {
        // In a Zed extension, the language server is built into the WASM module
        // The initialization is handled by the extension framework
        Ok(())
    }

    /// Handle document diagnostics request
    pub fn publish_diagnostics(&self, _uri: &str, _diagnostics: Vec<Diagnostic>) -> Result<()> {
        // Convert our diagnostics to LSP format and publish
        // This will be called by the pattern engine when patterns are detected
        Ok(())
    }

    /// Handle code action request
    pub fn handle_code_action(&self, _params: CodeActionParams) -> Result<Vec<CodeAction>> {
        // Return available code actions based on diagnostics
        // For example: "Ignore this pattern", "Add to baseline", "Correlate with other logs"
        Ok(vec![])
    }

    /// Handle hover request
    pub fn handle_hover(&self, _params: HoverParams) -> Result<Option<Hover>> {
        // Provide detailed information about patterns at cursor position
        Ok(None)
    }

    /// Handle goto definition request
    pub fn handle_goto_definition(
        &self,
        _params: GotoDefinitionParams,
    ) -> Result<Option<Location>> {
        // Jump to pattern definition in YAML config
        Ok(None)
    }
}

/// Diagnostic severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Information,
    Hint,
}

/// Diagnostic information for pattern matches
#[derive(Debug, Clone)]
pub struct Diagnostic {
    pub range: Range,
    pub severity: DiagnosticSeverity,
    pub message: String,
    pub source: String,
    pub code: Option<String>,
    pub related_information: Vec<RelatedInformation>,
}

impl Diagnostic {
    pub fn new(range: Range, severity: DiagnosticSeverity, message: impl Into<String>) -> Self {
        Self {
            range,
            severity,
            message: message.into(),
            source: "log-scout-analyzer".to_string(),
            code: None,
            related_information: vec![],
        }
    }

    pub fn with_code(mut self, code: impl Into<String>) -> Self {
        self.code = Some(code.into());
        self
    }

    pub fn with_related_info(mut self, info: RelatedInformation) -> Self {
        self.related_information.push(info);
        self
    }
}

/// Position in a document
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Position {
    pub line: u32,
    pub character: u32,
}

impl Position {
    pub fn new(line: u32, character: u32) -> Self {
        Self { line, character }
    }
}

/// Range in a document
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Range {
    pub start: Position,
    pub end: Position,
}

impl Range {
    pub fn new(start: Position, end: Position) -> Self {
        Self { start, end }
    }

    pub fn from_line(line: u32) -> Self {
        Self {
            start: Position::new(line, 0),
            end: Position::new(line, u32::MAX),
        }
    }

    pub fn from_line_range(start_line: u32, end_line: u32) -> Self {
        Self {
            start: Position::new(start_line, 0),
            end: Position::new(end_line, u32::MAX),
        }
    }
}

/// Related diagnostic information
#[derive(Debug, Clone)]
pub struct RelatedInformation {
    pub location: Location,
    pub message: String,
}

/// Location in a document
#[derive(Debug, Clone)]
pub struct Location {
    pub uri: String,
    pub range: Range,
}

/// Code action parameters
pub struct CodeActionParams {
    pub text_document: TextDocumentIdentifier,
    pub range: Range,
    pub context: CodeActionContext,
}

/// Code action context
pub struct CodeActionContext {
    pub diagnostics: Vec<Diagnostic>,
}

/// Code action
pub struct CodeAction {
    pub title: String,
    pub kind: CodeActionKind,
    pub diagnostics: Vec<Diagnostic>,
    pub edit: Option<WorkspaceEdit>,
    pub command: Option<Command>,
}

/// Code action kind
pub enum CodeActionKind {
    QuickFix,
    Refactor,
    RefactorExtract,
    RefactorInline,
    RefactorRewrite,
    Source,
    SourceOrganizeImports,
}

/// Workspace edit
pub struct WorkspaceEdit {
    pub changes: Vec<TextEdit>,
}

/// Text edit
pub struct TextEdit {
    pub range: Range,
    pub new_text: String,
}

/// Command
pub struct Command {
    pub title: String,
    pub command: String,
    pub arguments: Vec<String>,
}

/// Hover parameters
pub struct HoverParams {
    pub text_document: TextDocumentIdentifier,
    pub position: Position,
}

/// Hover information
pub struct Hover {
    pub contents: String,
    pub range: Option<Range>,
}

/// Goto definition parameters
pub struct GotoDefinitionParams {
    pub text_document: TextDocumentIdentifier,
    pub position: Position,
}

/// Text document identifier
#[derive(Debug, Clone)]
pub struct TextDocumentIdentifier {
    pub uri: String,
}

impl TextDocumentIdentifier {
    pub fn new(uri: impl Into<String>) -> Self {
        Self { uri: uri.into() }
    }
}
