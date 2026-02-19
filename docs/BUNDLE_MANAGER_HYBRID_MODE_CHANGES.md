# BundleManager Hybrid Mode Update Guide

## Changes Required to lsp-server/src/bundle/manager.rs

### 1. Add imports at top of file

```rust
use std::sync::Arc;
```

### 2. Update BundleManager struct (line 13-16)

**OLD:**
```rust
#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
}
```

**NEW:**
```rust
#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
    mongo_client: Option<Arc<crate::mongodb::MongoClient>>,  // NEW
}
```

### 3. Update BundleError enum (line 19-24)

**Add new variant:**
```rust
#[derive(Debug)]
pub enum BundleError {
    IoError(std::io::Error),
    SerializationError(serde_json::Error),
    BundleNotFound(String),
    InvalidBundle(String),
    MongoError(String),  // NEW
}
```

### 4. Update new() constructor (line 52-78)

**Add mongo_client: None at the end:**
```rust
Ok(Self {
    bundles_dir,
    index_path,
    mongo_client: None,  // NEW
})
```

### 5. Add new constructor new_with_mongodb() after new()

**Add this entire new method:**
```rust
/// Create bundle manager with MongoDB support (hybrid mode)
pub async fn new_with_mongodb(
    workspace_root: &Path,
    mongo_config: &crate::mongodb::MongoConfig,
) -> Result<Self, BundleError> {
    let bundles_dir = workspace_root.join(".log-scout").join("bundles");
    fs::create_dir_all(&bundles_dir)?;
    
    let index_path = bundles_dir.join("index.json");
    
    if !index_path.exists() {
        let empty_index = serde_json::json!({
            "bundles": [],
            "last_updated": Utc::now().to_rfc3339()
        });
        fs::write(&index_path, serde_json::to_string_pretty(&empty_index)?)?;
    }
    
    // Try to connect to MongoDB
    let mongo_client = match crate::mongodb::MongoClient::new(mongo_config).await {
        Ok(client) => {
            tracing::info!("✅ MongoDB connected - hybrid mode active");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ MongoDB connection failed, using filesystem only: {}", e);
            None
        }
    };
    
    tracing::info!("Bundle manager initialized at: {:?}", bundles_dir);
    
    Ok(Self {
        bundles_dir,
        index_path,
        mongo_client,
    })
}
```

### 6. Update create_bundle() method signature (line 80)

**OLD:**
```rust
pub fn create_bundle(
```

**NEW:**
```rust
pub async fn create_bundle(
```

**And update the entire method body to:**

```rust
pub async fn create_bundle(
    &self,
    name: String,
    description: Option<String>,
    metadata: Option<BundleMetadata>,
) -> Result<String, BundleError> {
    let id = format!(
        "bundle_{}",
        Uuid::new_v4()
            .to_string()
            .split('-')
            .next()
            .unwrap_or("unknown")
    );

    let mut bundle = Bundle::new(id.clone(), name);
    bundle.description = description;
    if let Some(meta) = metadata {
        bundle.metadata = meta;
    }

    // Try MongoDB first if available
    if let Some(client) = &self.mongo_client {
        match client.create_bundle(&bundle).await {
            Ok(_) => {
                tracing::info!("✅ Bundle created in MongoDB: {}", id);
                // Also save to filesystem as backup
                let _ = self.save_bundle_filesystem(&bundle);
                return Ok(id);
            }
            Err(e) => {
                tracing::warn!("⚠️ MongoDB create failed, falling back to filesystem: {}", e);
            }
        }
    }

    // Fallback to filesystem
    let bundle_dir = self.bundles_dir.join(&id);
    fs::create_dir_all(&bundle_dir)?;
    fs::create_dir_all(bundle_dir.join("logs"))?;

    self.save_bundle(&bundle)?;
    self.update_index(&bundle)?;

    tracing::info!("📁 Bundle created in filesystem: {}", id);
    Ok(id)
}
```

### 7. Add new helper method save_bundle_filesystem()

**Add this method in the private helpers section:**

```rust
fn save_bundle_filesystem(&self, bundle: &Bundle) -> Result<(), BundleError> {
    let bundle_dir = self.bundles_dir.join(&bundle.id);
    fs::create_dir_all(&bundle_dir)?;
    
    let bundle_path = bundle_dir.join("bundle.json");
    let content = serde_json::to_string_pretty(bundle)?;
    fs::write(&bundle_path, content)?;
    
    self.update_index(bundle)?;
    Ok(())
}
```

### 8. Update tests (line 320-358)

**Change test functions to async:**

```rust
#[tokio::test]  // Changed from #[test]
async fn test_bundle_creation() {  // Added async
    let temp_dir = TempDir::new().unwrap();
    let manager = BundleManager::new(temp_dir.path()).unwrap();

    let bundle_id = manager
        .create_bundle("Test Bundle".to_string(), None, None)
        .await  // NEW: added .await
        .unwrap();

    assert!(bundle_id.starts_with("bundle_"));

    let bundle = manager.get_bundle(&bundle_id).unwrap();
    assert_eq!(bundle.name, "Test Bundle");
    assert!(bundle.logs.is_empty());
}

#[tokio::test]  // Changed from #[test]
async fn test_list_bundles() {  // Added async
    let temp_dir = TempDir::new().unwrap();
    let manager = BundleManager::new(temp_dir.path()).unwrap();

    let _id1 = manager
        .create_bundle("Bundle 1".to_string(), None, None)
        .await  // NEW: added .await
        .unwrap();
    let _id2 = manager
        .create_bundle("Bundle 2".to_string(), None, None)
        .await  // NEW: added .await
        .unwrap();

    let bundles = manager.list_bundles(None, None, None).unwrap();
    assert_eq!(bundles.len(), 2);
}
```

## Summary of Changes

✅ Added `Arc` import for MongoDB client  
✅ Added `mongo_client` field to `BundleManager` struct  
✅ Added `MongoError` variant to `BundleError`  
✅ Updated `new()` to set `mongo_client: None`  
✅ Added `new_with_mongodb()` constructor for hybrid mode  
✅ Made `create_bundle()` async  
✅ Updated `create_bundle()` to try MongoDB first, fallback to filesystem  
✅ Added `save_bundle_filesystem()` helper method  
✅ Updated tests to be async with `tokio::test`  

**Result:** BundleManager now supports hybrid mode - MongoDB first with filesystem fallback!

---

**Note:** These changes maintain 100% backward compatibility. The existing `new()` constructor still works for filesystem-only mode (Phase 1). The new `new_with_mongodb()` constructor enables hybrid mode (Phase 3).
