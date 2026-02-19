// Complete Copy-Paste Ready Example
// Save this as: examples/cisco_auth_example.rs
// Run with: cargo run --example cisco_auth_example

use reqwest::Client;
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

/// Simple Cisco Scripts API authentication client
pub struct CiscoScriptsClient {
    http_client: Arc<Client>,
    base_url: String,
    token: Arc<Mutex<Option<String>>>,
}

impl CiscoScriptsClient {
    pub fn new() -> Self {
        Self {
            http_client: Arc::new(Client::new()),
            base_url: "https://scripts.cisco.com".to_string(),
            token: Arc::new(Mutex::new(None)),
        }
    }

    /// Exchange authorization code for access token
    ///
    /// Example usage:
    /// ```ignore
    /// let client = CiscoScriptsClient::new();
    /// let token = client.login("auth_code_here", "/app").await?;
    /// println!("Logged in! Token: {}", token.access_token);
    /// ```
    pub async fn login(
        &self,
        code: &str,
        redirect_path: &str,
    ) -> Result<TokenResponse, Box<dyn std::error::Error>> {
        let url = format!("{}/api/v2/auth/redirect:path", self.base_url);

        let response = self.http_client
            .get(&url)
            .query(&[
                ("path", redirect_path),
                ("code", code),
            ])
            .send()
            .await?;

        // Check for success
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Login failed: {} - {}", status, text).into());
        }

        // Parse response
        let token_response: TokenResponse = response.json().await?;

        // Store token
        *self.token.lock().await = Some(token_response.access_token.clone());

        Ok(token_response)
    }

    /// Get current access token
    pub async fn get_token(&self) -> Option<String> {
        self.token.lock().await.clone()
    }

    /// Make an authenticated GET request
    pub async fn get(
        &self,
        endpoint: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let token = self.get_token()
            .await
            .ok_or("Not authenticated. Call login() first.")?;

        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.http_client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Request failed: {} - {}", status, text).into());
        }

        Ok(response.text().await?)
    }

    /// Make an authenticated POST request
    pub async fn post(
        &self,
        endpoint: &str,
        body: serde_json::Value,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let token = self.get_token()
            .await
            .ok_or("Not authenticated. Call login() first.")?;

        let url = format!("{}{}", self.base_url, endpoint);

        let response = self.http_client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Request failed: {} - {}", status, text).into());
        }

        Ok(response.text().await?)
    }

    /// Clear stored token (logout)
    pub async fn logout(&self) {
        *self.token.lock().await = None;
    }

    /// Check if authenticated
    pub async fn is_authenticated(&self) -> bool {
        self.token.lock().await.is_some()
    }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Cisco Scripts API Authentication Example ===\n");

    // 1. Create client
    let client = CiscoScriptsClient::new();
    println!("✓ Created client");

    // 2. Check authentication status
    println!("Authenticated: {}\n", client.is_authenticated().await);

    // 3. Get authorization code
    // In a real application, this would come from user interaction or OAuth flow
    let auth_code = std::env::var("CISCO_AUTH_CODE")
        .expect("Please set CISCO_AUTH_CODE environment variable");

    println!("Using authorization code: {}...", &auth_code[..10.min(auth_code.len())]);

    // 4. Exchange code for token
    println!("\n📝 Exchanging code for access token...");
    match client.login(&auth_code, "/app").await {
        Ok(token_response) => {
            println!("✓ Successfully authenticated!");
            println!("  Token type: {}", token_response.token_type);
            if let Some(expires) = token_response.expires_in {
                println!("  Expires in: {} seconds", expires);
            }
            if token_response.refresh_token.is_some() {
                println!("  Has refresh token: yes");
            }
        }
        Err(e) => {
            println!("✗ Authentication failed: {}", e);
            println!("\nMake sure you have:");
            println!("  1. A valid authorization code");
            println!("  2. Internet connection");
            println!("  3. Valid Cisco credentials");
            return Err(e);
        }
    }

    // 5. Verify we're authenticated
    println!("\nAuthenticated: {}", client.is_authenticated().await);

    // 6. Example: Fetch scripts (if endpoint is available)
    println!("\n📡 Example: Fetching scripts...");
    match client.get("/api/v2/scripts").await {
        Ok(response) => {
            println!("✓ Scripts response received");
            println!("Response length: {} bytes", response.len());

            // Pretty-print first 200 chars
            if response.len() > 200 {
                println!("Response preview: {}...", &response[..200]);
            } else {
                println!("Response: {}", response);
            }
        }
        Err(e) => {
            println!("Note: Could not fetch scripts: {}", e);
            println!("This is OK if the endpoint requires specific permissions.");
        }
    }

    // 7. Logout
    println!("\n🚪 Logging out...");
    client.logout().await;
    println!("✓ Logged out");
    println!("Authenticated: {}", client.is_authenticated().await);

    println!("\n✅ Example completed successfully!");
    Ok(())
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client_creation() {
        let client = CiscoScriptsClient::new();
        assert!(!client.is_authenticated().await);
    }

    #[tokio::test]
    async fn test_token_storage() {
        let client = CiscoScriptsClient::new();

        // Store token manually (simulating successful login)
        *client.token.lock().await = Some("test_token_123".to_string());

        // Verify token is stored
        assert!(client.is_authenticated().await);
        assert_eq!(
            client.get_token().await,
            Some("test_token_123".to_string())
        );

        // Verify logout clears token
        client.logout().await;
        assert!(!client.is_authenticated().await);
        assert_eq!(client.get_token().await, None);
    }
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

/*
To run this example:

1. Add reqwest to your Cargo.toml:
   ```toml
   [dependencies]
   reqwest = { version = "0.11", features = ["json"] }
   serde = { version = "1", features = ["derive"] }
   serde_json = "1"
   tokio = { version = "1", features = ["full"] }
   ```

2. Save this file as: examples/cisco_auth_example.rs

3. Get an authorization code:
   - Visit Cisco Scripts site and log in
   - Look for authorization code in callback URL

4. Run the example:
   ```bash
   CISCO_AUTH_CODE=your_code_here cargo run --example cisco_auth_example
   ```

5. Expected output:
   ```
   === Cisco Scripts API Authentication Example ===

   ✓ Created client
   Authenticated: false

   Using authorization code: abc123def...

   📝 Exchanging code for access token...
   ✓ Successfully authenticated!
     Token type: Bearer
     Expires in: 3600 seconds
     Has refresh token: yes

   Authenticated: true

   📡 Example: Fetching scripts...
   ✓ Scripts response received
   ...
   ```
*/
