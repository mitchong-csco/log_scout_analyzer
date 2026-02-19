// Authentication client for Cisco Scripts API
// File: crates/tagscout-integration/src/cisco_auth.rs

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CiscoAuthClient {
    http_client: Arc<reqwest::Client>,
    base_url: String,
    access_token: Arc<Mutex<Option<String>>>,
    bdb_cookie: Arc<Mutex<Option<String>>>,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(String),

    #[error("JSON parsing failed: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("No access token available")]
    NoAccessToken,

    #[error("Token exchange failed: {0}")]
    TokenExchangeFailed(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}

impl CiscoAuthClient {
    /// Create a new authentication client
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            http_client: Arc::new(reqwest::Client::new()),
            base_url: base_url.into(),
            access_token: Arc::new(Mutex::new(None)),
            bdb_cookie: Arc::new(Mutex::new(None)),
        }
    }

    /// Exchange authorization code for access token
    ///
    /// # Arguments
    /// * `code` - Authorization code from Cisco login
    /// * `redirect_path` - Redirect path (default: "/app")
    ///
    /// # Errors
    /// Returns `AuthError` if the exchange fails
    pub async fn exchange_code_for_token(
        &self,
        code: String,
        redirect_path: String,
    ) -> Result<TokenResponse, AuthError> {
        let url = format!(
            "{}/api/v2/auth/redirect:path",
            self.base_url
        );

        let response = self.http_client
            .get(&url)
            .query(&[
                ("path", redirect_path.as_str()),
                ("code", code.as_str()),
            ])
            .send()
            .await
            .map_err(|e| AuthError::RequestFailed(e.to_string()))?;

        // Extract bdb_cookie from response headers if present
        if let Some(cookie) = response
            .headers()
            .get(reqwest::header::SET_COOKIE)
            .and_then(|h| h.to_str().ok())
        {
            *self.bdb_cookie.lock().await = Some(cookie.to_string());
        }

        // Check status code
        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AuthError::TokenExchangeFailed(format!(
                "Status {}: {}",
                status, error_text
            )));
        }

        // Parse response
        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| AuthError::TokenExchangeFailed(e.to_string()))?;

        // Store access token
        *self.access_token.lock().await = Some(token_response.access_token.clone());

        Ok(token_response)
    }

    /// Get current access token
    pub async fn get_access_token(&self) -> Option<String> {
        self.access_token.lock().await.clone()
    }

    /// Get stored bdb_cookie
    pub async fn get_bdb_cookie(&self) -> Option<String> {
        self.bdb_cookie.lock().await.clone()
    }

    /// Make authenticated GET request
    pub async fn get(
        &self,
        endpoint: &str,
    ) -> Result<reqwest::Response, AuthError> {
        let token = self.get_access_token()
            .await
            .ok_or(AuthError::NoAccessToken)?;

        let url = format!("{}{}", self.base_url, endpoint);

        self.http_client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| AuthError::RequestFailed(e.to_string()))
    }

    /// Make authenticated POST request
    pub async fn post(
        &self,
        endpoint: &str,
        body: serde_json::Value,
    ) -> Result<reqwest::Response, AuthError> {
        let token = self.get_access_token()
            .await
            .ok_or(AuthError::NoAccessToken)?;

        let url = format!("{}{}", self.base_url, endpoint);

        self.http_client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| AuthError::RequestFailed(e.to_string()))
    }

    /// Clear stored token and cookie (logout)
    pub async fn clear(&self) {
        *self.access_token.lock().await = None;
        *self.bdb_cookie.lock().await = None;
    }

    /// Check if authenticated
    pub async fn is_authenticated(&self) -> bool {
        self.access_token.lock().await.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_client_creation() {
        let client = CiscoAuthClient::new("https://scripts.cisco.com");
        assert_eq!(client.base_url, "https://scripts.cisco.com");
    }

    #[tokio::test]
    async fn test_token_storage() {
        let client = CiscoAuthClient::new("https://scripts.cisco.com");

        // Initially no token
        assert!(client.get_access_token().await.is_none());
        assert!(!client.is_authenticated().await);

        // Simulate storing a token (in real usage, from exchange_code_for_token)
        *client.access_token.lock().await = Some("test_token".to_string());

        // Now should have token
        assert_eq!(
            client.get_access_token().await,
            Some("test_token".to_string())
        );
        assert!(client.is_authenticated().await);

        // Clear token
        client.clear().await;
        assert!(client.get_access_token().await.is_none());
    }
}
