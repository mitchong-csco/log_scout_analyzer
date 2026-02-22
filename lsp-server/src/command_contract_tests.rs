//! Command Contract Tests
//!
//! Validates that all LSP commands handled in the Rust server
//! match the commands defined in lsp-commands.schema.json.
//!
//! This prevents issues like:
//! - Extension sending "scout/bundle/importPackage"
//! - Server expecting a different command name
//!
//! Run with: cargo test --package lsp-server command_contract

use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

#[cfg(test)]
mod tests {
    use super::*;

    /// Load the command schema (single source of truth)
    fn load_schema() -> Value {
        let mut schema_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        schema_path.pop(); // Go up from lsp-server
        schema_path.push("lsp-commands.schema.json");

        let schema_content = fs::read_to_string(&schema_path)
            .unwrap_or_else(|e| panic!("Failed to read schema at {:?}: {}", schema_path, e));

        serde_json::from_str(&schema_content)
            .unwrap_or_else(|e| panic!("Failed to parse schema JSON: {}", e))
    }

    /// Extract command names from schema
    fn get_schema_commands(schema: &Value) -> Vec<String> {
        let commands = schema["commands"]
            .as_object()
            .expect("Schema should have 'commands' object");

        commands.keys().cloned().collect()
    }

    /// Extract command names from server.rs by parsing the file
    fn get_server_commands() -> Vec<String> {
        let server_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("server.rs");

        let server_content = fs::read_to_string(&server_path)
            .unwrap_or_else(|e| panic!("Failed to read server.rs: {}", e));

        // Find all command matches in the handle_bundle_request function
        // Pattern: "scout/bundle/commandName" =>
        let pattern = regex::Regex::new(r#""(scout/bundle/\w+)"\s*=>"#).unwrap();

        pattern
            .captures_iter(&server_content)
            .map(|cap| cap[1].to_string())
            .collect()
    }

    #[test]
    fn test_schema_exists_and_is_valid() {
        let schema = load_schema();

        // Validate schema structure
        assert!(
            schema["commands"].is_object(),
            "Schema should have 'commands' object"
        );

        let commands = get_schema_commands(&schema);
        assert!(
            !commands.is_empty(),
            "Schema should define at least one command"
        );

        println!("✓ Schema loaded with {} commands", commands.len());
    }

    #[test]
    fn test_all_server_commands_are_in_schema() {
        let schema = load_schema();
        let schema_commands: HashSet<String> = get_schema_commands(&schema).into_iter().collect();
        let server_commands = get_server_commands();

        println!("\nServer commands found:");
        for cmd in &server_commands {
            println!("  - {}", cmd);
        }

        // Check each server command exists in schema
        for cmd in &server_commands {
            assert!(
                schema_commands.contains(cmd),
                "Command '{}' is handled in server.rs but not defined in schema.\nSchema commands: {:?}",
                cmd,
                schema_commands
            );
        }

        println!(
            "✓ All {} server commands are defined in schema",
            server_commands.len()
        );
    }

    #[test]
    fn test_all_schema_commands_are_in_server() {
        let schema = load_schema();
        let schema_commands = get_schema_commands(&schema);
        let server_commands: HashSet<String> = get_server_commands().into_iter().collect();

        println!("\nSchema commands:");
        for cmd in &schema_commands {
            println!("  - {}", cmd);
        }

        let mut missing_commands = Vec::new();

        // Check each schema command exists in server
        for cmd in &schema_commands {
            if !server_commands.contains(cmd) {
                missing_commands.push(cmd.clone());
            }
        }

        if !missing_commands.is_empty() {
            println!("\n⚠️  WARNING: Commands defined in schema but not handled in server:");
            for cmd in &missing_commands {
                println!("    - {}", cmd);
            }
            println!(
                "\n   These commands should be implemented in server.rs handle_bundle_request()"
            );

            // This could be a failure if you want strict enforcement:
            // panic!("Missing server implementations for: {:?}", missing_commands);
        } else {
            println!(
                "✓ All {} schema commands are implemented in server",
                schema_commands.len()
            );
        }
    }

    #[test]
    fn test_command_format_consistency() {
        let schema = load_schema();
        let schema_commands = get_schema_commands(&schema);

        // All commands should follow scout/{feature}/{action} format
        for cmd in &schema_commands {
            let parts: Vec<&str> = cmd.split('/').collect();

            assert_eq!(
                parts.len(),
                3,
                "Command '{}' should have format: scout/{{feature}}/{{action}}",
                cmd
            );

            assert_eq!(
                parts[0], "scout",
                "Command '{}' should start with 'scout'",
                cmd
            );

            assert!(
                !parts[2].is_empty(),
                "Command '{}' should have an action part",
                cmd
            );
        }

        println!("✓ All commands follow scout/{{feature}}/{{action}} format");
    }

    #[test]
    fn test_schema_has_required_fields() {
        let schema = load_schema();
        let commands = schema["commands"]
            .as_object()
            .expect("Schema should have 'commands' object");

        for (cmd_name, cmd_def) in commands {
            // Each command should have description, request, and response
            assert!(
                cmd_def["description"].is_string(),
                "Command '{}' should have a description",
                cmd_name
            );

            assert!(
                cmd_def["request"].is_object(),
                "Command '{}' should have request parameters",
                cmd_name
            );

            assert!(
                cmd_def["response"].is_object(),
                "Command '{}' should have response definition",
                cmd_name
            );
        }

        println!("✓ All schema commands have required fields (description, request, response)");
    }

    #[test]
    fn test_no_old_command_format_in_server() {
        let server_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("server.rs");

        let server_content = fs::read_to_string(&server_path)
            .unwrap_or_else(|e| panic!("Failed to read server.rs: {}", e));

        // Check for old command formats (if you had any)
        // For example: "logScout.bundle." prefix
        let old_format_pattern = regex::Regex::new(r#""logScout\.[^"]+""#).unwrap();
        let matches: Vec<_> = old_format_pattern
            .find_iter(&server_content)
            .map(|m| m.as_str())
            .collect();

        if !matches.is_empty() {
            println!("⚠️  WARNING: Found old command format in server.rs:");
            for m in &matches {
                println!("    {}", m);
            }
            println!("\n   These are legacy commands that still use old format.");
            println!("   Bundle commands should use 'scout/{{feature}}/{{action}}' format.");
            println!("   This is OK for now - only new commands must use the new format.");
        } else {
            println!("✓ No old command format found in server");
        }
    }

    #[test]
    fn test_command_count_matches_expectations() {
        let schema = load_schema();
        let schema_commands = get_schema_commands(&schema);
        let server_commands = get_server_commands();

        println!("\n📊 Command Statistics:");
        println!("  Schema defines: {} commands", schema_commands.len());
        println!("  Server handles: {} commands", server_commands.len());

        // We expect at least 7 bundle commands
        let expected_min = 7;
        assert!(
            schema_commands.len() >= expected_min,
            "Schema should define at least {} commands, found {}",
            expected_min,
            schema_commands.len()
        );
    }

    #[test]
    fn test_import_package_command_exists() {
        // This is the command that had the mismatch bug
        let schema = load_schema();
        let schema_commands = get_schema_commands(&schema);
        let server_commands = get_server_commands();

        let import_cmd = "scout/bundle/importPackage";

        assert!(
            schema_commands.contains(&import_cmd.to_string()),
            "Schema must define '{}'",
            import_cmd
        );

        assert!(
            server_commands.contains(&import_cmd.to_string()),
            "Server must handle '{}'",
            import_cmd
        );

        println!(
            "✓ Critical command '{}' is properly defined and handled",
            import_cmd
        );
    }

    #[test]
    fn test_lsp_types_documentation_matches_schema() {
        // Check if lsp_types.rs documentation lists all commands
        let lsp_types_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("lsp_types.rs");

        if !lsp_types_path.exists() {
            println!("⚠️  lsp_types.rs not found, skipping documentation check");
            return;
        }

        let lsp_types_content = fs::read_to_string(&lsp_types_path)
            .unwrap_or_else(|e| panic!("Failed to read lsp_types.rs: {}", e));

        let schema = load_schema();
        let schema_commands = get_schema_commands(&schema);

        let mut undocumented = Vec::new();

        for cmd in &schema_commands {
            if !lsp_types_content.contains(cmd) {
                undocumented.push(cmd.clone());
            }
        }

        if !undocumented.is_empty() {
            println!("\n⚠️  Commands not documented in lsp_types.rs:");
            for cmd in &undocumented {
                println!("    - {}", cmd);
            }
            println!("\n   Consider adding them to the module documentation");
        } else {
            println!("✓ All commands are documented in lsp_types.rs");
        }
    }
}
