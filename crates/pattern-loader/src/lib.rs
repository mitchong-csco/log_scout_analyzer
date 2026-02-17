//! Pattern Loader - Pattern loading and override management
//!
//! This crate handles loading patterns from various sources and managing
//! pattern overrides for customization.

pub mod loader;
pub mod marking;
pub mod override_manager;

pub use loader::PatternLoader;
pub use override_manager::PatternOverrideManager;
