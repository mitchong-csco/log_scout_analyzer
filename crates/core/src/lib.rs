//! Log Scout Core - Shared types and utilities
//!
//! This crate provides core types and utilities used across all Log Scout components.

pub mod config;
pub mod diagnostics;
pub mod document;

pub use config::Config;
pub use diagnostics::Diagnostic;
pub use document::Document;
