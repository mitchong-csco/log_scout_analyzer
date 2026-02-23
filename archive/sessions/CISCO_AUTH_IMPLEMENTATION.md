# Cisco Scripts API Authentication Implementation Guide

## Overview
This guide explains how to implement OAuth2-style authentication with the Cisco Scripts API to:
1. Get an authorization code from the user
2. Exchange the code for an access token
3. Use the access token for authenticated API requests

## API Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Login/Authorization                                    │
│     ↓                                                            │
│  2. Receive Authorization Code (from Cisco login)              │
│     ↓                                                            │
│  3. Exchange Code for Access Token                             │
│     GET /api/v2/auth/redirect:path?code=<CODE>                │
│     ↓                                                            │
│  4. Store Access Token & bdb_cookie                            │
│     ↓                                                            │
│  5. Use Token for Subsequent API Requests                      │
│     Authorization: Bearer <ACCESS_TOKEN>                        │
└─────────────────────────────────────────────────────────────────┘
```

## Endpoint Details

### Token Exchange Endpoint
```
Method: GET
URL: https://scripts.cisco.com/api/v2/auth/redirect:path

Path Parameters:
- path (required): Redirect path 
  Format: ^$|(/\(app|ui|app_dev\).*)
  Examples: "/app", "/app/dashboard", "/ui", "/app_dev", ""

Query Parameters:
- code (required): Authorization code from login

Response (201 Created):
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": number,    // seconds
  "refresh_token": "string" // optional
}

Response Headers:
- Set-Cookie: bdb_cookie=<value>; Path=/; Secure; HttpOnly
```

## Implementation Guide

### For Rust/LSP Server (Recommended)

Add to `Cargo.toml`:
```toml
# In workspace.dependencies section
reqwest = { version = "0.11", features = ["json", "cookies"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

### Example: Rust Implementation

**1. Define authentication types:**
```rust
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: Option<i64>,
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CiscoAuthClient {
    http_client: Arc<Client>,
    base_url: String,
    access_token: Arc<Mutex<Option<String>>>,
    bdb_cookie: Arc<Mutex<Option<String>>>,
}
```

**2. Implement token exchange:**
```rust
impl CiscoAuthClient {
    pub fn new(base_url: String) -> Self {
        Self {
            http_client: Arc::new(Client::new()),
            base_url,
            access_token: Arc::new(Mutex::new(None)),
            bdb_cookie: Arc::new(Mutex::new(None)),
        }
    }

    /// Exchange authorization code for access token
    pub async fn exchange_code_for_token(
        &self,
        code: String,
        redirect_path: String,
    ) -> Result<TokenResponse, Box<dyn std::error::Error>> {
        let url = format!(
            "{}/api/v2/auth/redirect:path?path={}&code={}",
            self.base_url,
            urlencoding::encode(&redirect_path),
            urlencoding::encode(&code)
        );

        let response = self.http_client
            .get(&url)
            .send()
            .await?;

        // Extract bdb_cookie from response headers if present
        if let Some(cookie) = response
            .headers()
            .get(reqwest::header::SET_COOKIE)
            .and_then(|h| h.to_str().ok())
        {
            *self.bdb_cookie.lock().await = Some(cookie.to_string());
        }

        // Parse response
        let token_response: TokenResponse = response.json().await?;
        
        // Store access token
        *self.access_token.lock().await = Some(token_response.access_token.clone());

        Ok(token_response)
    }

    /// Get current access token
    pub async fn get_access_token(&self) -> Option<String> {
        self.access_token.lock().await.clone()
    }

    /// Make authenticated request
    pub async fn authenticated_request(
        &self,
        method: &str,
        endpoint: &str,
    ) -> Result<reqwest::Response, Box<dyn std::error::Error>> {
        let token = self.get_access_token()
            .await
            .ok_or("No access token available")?;

        let url = format!("{}{}", self.base_url, endpoint);

        let response = match method {
            "GET" => self.http_client
                .get(&url)
                .bearer_auth(&token)
                .send()
                .await?,
            "POST" => self.http_client
                .post(&url)
                .bearer_auth(&token)
                .send()
                .await?,
            _ => return Err("Unsupported HTTP method".into()),
        };

        Ok(response)
    }
}
```

### For TypeScript/Node.js

**Install dependencies:**
```bash
npm install axios dotenv
```

**Implementation:**
```typescript
import axios, { AxiosInstance } from 'axios';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

class CiscoAuthClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private accessToken: string | null = null;
  private bdbCookie: string | null = null;

  constructor(baseUrl: string = 'https://scripts.cisco.com') {
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      withCredentials: true, // Important for cookie handling
    });
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectPath: string = '/app'
  ): Promise<TokenResponse> {
    try {
      const response = await this.httpClient.get<TokenResponse>(
        `/api/v2/auth/redirect:path`,
        {
          params: {
            path: redirectPath,
            code: code,
          },
        }
      );

      // Extract bdb_cookie from response headers
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.bdbCookie = Array.isArray(cookies) ? cookies[0] : cookies;
      }

      // Store access token
      this.accessToken = response.data.access_token;

      return response.data;
    } catch (error) {
      throw new Error(`Token exchange failed: ${error}`);
    }
  }

  /**
   * Make authenticated request
   */
  async makeAuthenticatedRequest<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const config = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    };

    try {
      const response = await this.httpClient({
        method,
        url: endpoint,
        data,
        ...config,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Authenticated request failed: ${error}`);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getBdbCookie(): string | null {
    return this.bdbCookie;
  }
}

// Usage example
(async () => {
  const client = new CiscoAuthClient();
  
  try {
    // Step 1: Exchange code for token
    const tokenResponse = await client.exchangeCodeForToken(
      'your-auth-code-here',
      '/app'
    );
    
    console.log('Token received:', tokenResponse);
    
    // Step 2: Use token for subsequent requests
    const data = await client.makeAuthenticatedRequest('GET', '/api/v2/scripts');
    console.log('Scripts data:', data);
    
  } catch (error) {
    console.error('Authentication error:', error);
  }
})();
```

### For Python

**Install dependencies:**
```bash
pip install requests python-dotenv
```

**Implementation:**
```python
import requests
from typing import Optional, Dict, Any
import json

class CiscoAuthClient:
    def __init__(self, base_url: str = 'https://scripts.cisco.com'):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.bdb_cookie: Optional[str] = None

    def exchange_code_for_token(
        self,
        code: str,
        redirect_path: str = '/app'
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        
        url = f"{self.base_url}/api/v2/auth/redirect:path"
        params = {
            'path': redirect_path,
            'code': code,
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            # Extract bdb_cookie from response headers
            if 'set-cookie' in response.headers:
                self.bdb_cookie = response.headers['set-cookie']
            
            # Parse token response
            token_data = response.json()
            self.access_token = token_data.get('access_token')
            
            return token_data
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Token exchange failed: {e}")

    def make_authenticated_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated API request with access token."""
        
        if not self.access_token:
            raise ValueError("No access token available")
        
        url = f"{self.base_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            **kwargs.get('headers', {})
        }
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Authenticated request failed: {e}")

    def get_access_token(self) -> Optional[str]:
        """Get current access token."""
        return self.access_token

    def get_bdb_cookie(self) -> Optional[str]:
        """Get bdb_cookie."""
        return self.bdb_cookie


# Usage example
if __name__ == '__main__':
    client = CiscoAuthClient()
    
    try:
        # Step 1: Exchange code for token
        token_response = client.exchange_code_for_token(
            code='your-auth-code-here',
            redirect_path='/app'
        )
        print('Token response:', json.dumps(token_response, indent=2))
        
        # Step 2: Use token for subsequent requests
        scripts = client.make_authenticated_request(
            'GET',
            '/api/v2/scripts'
        )
        print('Scripts:', json.dumps(scripts, indent=2))
        
    except Exception as e:
        print(f'Error: {e}')
```

## Integration Steps for Log Scout Analyzer

### 1. Add HTTP Client to Workspace Dependencies

Edit `Cargo.toml`:
```toml
[workspace.dependencies]
# ... existing dependencies ...
reqwest = { version = "0.11", features = ["json", "cookies", "stream"] }
serde_json = "1"
```

### 2. Create Auth Module

Create `crates/tagscout-integration/src/cisco_auth.rs` with the authentication client.

### 3. Integrate into LSP Server

Add to your LSP server's state management:
```rust
pub struct ServerState {
    // ... existing fields ...
    cisco_auth: Option<CiscoAuthClient>,
}
```

### 4. Add Commands for Authentication

Implement LSP commands:
```rust
"cisco.auth.login" // Trigger authentication flow
"cisco.auth.getToken" // Get current token
"cisco.auth.logout" // Clear token
```

## Security Best Practices

1. **Never log tokens** - Store in memory only, never in logs
2. **Use HTTPS only** - Always use secure connections
3. **Token expiration** - Implement token refresh logic
4. **Secure storage** - Use OS keyrings for persistent storage if needed
5. **CORS/Headers** - Ensure appropriate security headers

## Error Handling

Common responses:
- **201 Created**: Successful token exchange
- **400 Bad Request**: Invalid code or path parameter
- **500 Server Error**: Server-side issue, retry with exponential backoff

## Environment Configuration

Create `.env`:
```
CISCO_BASE_URL=https://scripts.cisco.com
CISCO_REDIRECT_PATH=/app
```

Load in your code:
```rust
let base_url = std::env::var("CISCO_BASE_URL")
    .unwrap_or_else(|_| "https://scripts.cisco.com".to_string());
```

## Testing

Test the authentication flow:

```bash
# Get auth code (manual step - user logs in at Cisco portal)
# Then test token exchange:

curl -X GET "https://scripts.cisco.com/api/v2/auth/redirect:path?path=/app&code=YOUR_CODE_HERE"
```

## References

- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Bearer Token Authentication](https://tools.ietf.org/html/rfc6750)
- [OAuth 2.0 Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)
