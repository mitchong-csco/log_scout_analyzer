//! Log Scout Analyzer - LSP Server Library
//!
//! Core modules for the Language Server Protocol implementation.

pub mod bundle;
pub mod config;
pub mod diagnostics;
pub mod document;
pub mod mongodb;
pub mod pattern_engine;
pub mod pattern_loader;
pub mod pattern_quality_evaluator;
pub mod pattern_tester;
pub mod quality_monitor;
pub mod server;
pub mod tagscout;

#[cfg(test)]
pub mod command_contract_tests;

pub use server::LogScoutServer;
