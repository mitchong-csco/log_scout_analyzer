// Integration example for LSP server
// File: crates/lsp-server/src/auth_handler.rs

use tower_lsp::lsp_types::{
    CodeActionOrCommand, CodeActionParams, CodeActionResponse,
    ExecuteCommandParams, Position, Range, TextEdit, WorkspaceEdit,
};
use serde_json::{json, Value};
use crate::cisco_auth::CiscoAuthClient;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AuthHandler {
    auth_client: Arc<CiscoAuthClient>,
}

impl AuthHandler {
    pub fn new(auth_client: Arc<CiscoAuthClient>) -> Self {
        Self { auth_client }
    }

    /// Handle the "cisco.auth.login" command
    /// Requires the authorization code as parameter
    pub async fn handle_login_command(
        &self,
        code: String,
        redirect_path: Option<String>,
    ) -> Result<Value, String> {
        let path = redirect_path.unwrap_or_else(|| "/app".to_string());

        match self.auth_client.exchange_code_for_token(code, path).await {
            Ok(token_response) => {
                Ok(json!({
                    "success": true,
                    "message": "Successfully logged in to Cisco Scripts",
                    "token_type": token_response.token_type,
                    "expires_in": token_response.expires_in,
                }))
            }
            Err(e) => {
                Err(format!("Login failed: {}", e))
            }
        }
    }

    /// Handle the "cisco.auth.getToken" command
    pub async fn handle_get_token_command(&self) -> Result<Value, String> {
        match self.auth_client.get_access_token().await {
            Some(token) => {
                Ok(json!({
                    "success": true,
                    "token": token,
                    "authenticated": true,
                }))
            }
            None => {
                Ok(json!({
                    "success": false,
                    "authenticated": false,
                    "message": "Not authenticated. Please log in first.",
                }))
            }
        }
    }

    /// Handle the "cisco.auth.logout" command
    pub async fn handle_logout_command(&self) -> Result<Value, String> {
        self.auth_client.clear().await;
        Ok(json!({
            "success": true,
            "message": "Successfully logged out",
        }))
    }

    /// Handle the "cisco.auth.status" command
    pub async fn handle_status_command(&self) -> Result<Value, String> {
        let is_authenticated = self.auth_client.is_authenticated().await;
        Ok(json!({
            "authenticated": is_authenticated,
            "has_cookie": self.auth_client.get_bdb_cookie().await.is_some(),
        }))
    }

    /// Handle the "cisco.scripts.list" command (example of using token)
    pub async fn handle_list_scripts_command(&self) -> Result<Value, String> {
        match self.auth_client.get("/api/v2/scripts").await {
            Ok(response) => {
                match response.json::<Value>().await {
                    Ok(data) => Ok(data),
                    Err(e) => Err(format!("Failed to parse response: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to fetch scripts: {}", e)),
        }
    }
}

/// Execute a command sent from the client
pub async fn execute_command(
    command: String,
    arguments: Vec<Value>,
    auth_handler: Arc<AuthHandler>,
) -> Result<Value, String> {
    match command.as_str() {
        "cisco.auth.login" => {
            let code = arguments.get(0)
                .and_then(|v| v.as_str())
                .ok_or("Missing authorization code")?
                .to_string();

            let redirect_path = arguments.get(1)
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            auth_handler.handle_login_command(code, redirect_path).await
        }

        "cisco.auth.getToken" => {
            auth_handler.handle_get_token_command().await
        }

        "cisco.auth.logout" => {
            auth_handler.handle_logout_command().await
        }

        "cisco.auth.status" => {
            auth_handler.handle_status_command().await
        }

        "cisco.scripts.list" => {
            auth_handler.handle_list_scripts_command().await
        }

        _ => Err(format!("Unknown command: {}", command)),
    }
}
