//! Integration tests for call-flow CLI commands

use assert_cmd::Command;
use predicates::prelude::*;
use std::fs;
use std::path::PathBuf;

fn get_test_data_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("test-data")
        .join("sample-ctrace.log")
}

#[test]
fn test_call_flow_help() {
    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Analyze SIP call flows"))
        .stdout(predicate::str::contains("list"))
        .stdout(predicate::str::contains("show"))
        .stdout(predicate::str::contains("analyze"))
        .stdout(predicate::str::contains("export"));
}

#[test]
fn test_call_flow_list_success() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("list")
        .arg(&test_file)
        .assert()
        .success()
        .stdout(predicate::str::contains("Found 3 call session(s)"))
        .stdout(predicate::str::contains("001a2f8d-f17f0004"))
        .stdout(predicate::str::contains("002b3g9e-g28g0005"))
        .stdout(predicate::str::contains("003c4h0f-h39h0006"))
        .stdout(predicate::str::contains("messages"));
}

#[test]
fn test_call_flow_list_missing_file() {
    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("list")
        .arg("nonexistent.log")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Error"));
}

#[test]
fn test_call_flow_show_success() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("001a2f8d")
        .arg("--bundle")
        .arg(&test_file)
        .assert()
        .success()
        .stdout(predicate::str::contains("Call Flow Analysis"))
        .stdout(predicate::str::contains("001a2f8d-f17f0004"))
        .stdout(predicate::str::contains("Sequence Diagram"))
        .stdout(predicate::str::contains("INVITE"))
        .stdout(predicate::str::contains("Call Summary"))
        .stdout(predicate::str::contains("Timing Metrics"));
}

#[test]
fn test_call_flow_show_missing_bundle() {
    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("001a2f8d")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Bundle path is required"));
}

#[test]
fn test_call_flow_show_call_not_found() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("nonexistent-call-id")
        .arg("--bundle")
        .arg(&test_file)
        .assert()
        .failure()
        .stderr(predicate::str::contains("not found"));
}

#[test]
fn test_call_flow_show_format_markdown() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("001a2f8d")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--format")
        .arg("markdown")
        .assert()
        .success()
        .stdout(predicate::str::contains("# Call Flow Analysis"))
        .stdout(predicate::str::contains("```text"));
}

#[test]
fn test_call_flow_show_format_plain() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("001a2f8d")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--format")
        .arg("plain")
        .assert()
        .success()
        .stdout(predicate::str::contains("Call Flow:"))
        .stdout(predicate::str::contains("INVITE"));
}

#[test]
fn test_call_flow_analyze_success() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("analyze")
        .arg(&test_file)
        .assert()
        .success()
        .stdout(predicate::str::contains(
            "Displaying 3 of 3 call session(s)",
        ))
        .stdout(predicate::str::contains("Call Flow Analysis"))
        .stdout(predicate::str::contains("Sequence Diagram"));
}

#[test]
fn test_call_flow_analyze_with_limit() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("analyze")
        .arg(&test_file)
        .arg("--limit")
        .arg("2")
        .assert()
        .success()
        .stdout(predicate::str::contains(
            "Displaying 2 of 3 call session(s)",
        ))
        .stdout(predicate::str::contains("Showing 2 of 3 calls"));
}

#[test]
fn test_call_flow_export_success() {
    let test_file = get_test_data_path();
    let output_file = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("test-export.md");

    // Clean up if exists
    let _ = fs::remove_file(&output_file);

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("export")
        .arg("001a2f8d")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--output")
        .arg(&output_file)
        .assert()
        .success()
        .stdout(predicate::str::contains("exported to"));

    // Verify file was created and has content
    assert!(output_file.exists());
    let content = fs::read_to_string(&output_file).unwrap();
    assert!(content.contains("Call Flow Analysis"));
    assert!(content.contains("001a2f8d-f17f0004"));
    assert!(content.contains("INVITE"));

    // Clean up
    fs::remove_file(&output_file).unwrap();
}

#[test]
fn test_call_flow_export_markdown_format() {
    let test_file = get_test_data_path();
    let output_file = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("test-export-md.md");

    // Clean up if exists
    let _ = fs::remove_file(&output_file);

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("export")
        .arg("002b3g9e")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--output")
        .arg(&output_file)
        .arg("--format")
        .arg("markdown")
        .assert()
        .success();

    // Verify markdown format
    let content = fs::read_to_string(&output_file).unwrap();
    assert!(content.contains("# Call Flow Analysis"));
    assert!(content.contains("```text"));
    assert!(content.contains("## Call Summary"));

    // Clean up
    fs::remove_file(&output_file).unwrap();
}

#[test]
fn test_call_flow_export_plain_format() {
    let test_file = get_test_data_path();
    let output_file = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("test-export-plain.txt");

    // Clean up if exists
    let _ = fs::remove_file(&output_file);

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("export")
        .arg("003c4h0f")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--output")
        .arg(&output_file)
        .arg("--format")
        .arg("plain")
        .assert()
        .success();

    // Verify plain format (no markdown headers)
    let content = fs::read_to_string(&output_file).unwrap();
    assert!(content.contains("Call Flow:"));
    assert!(content.contains("003c4h0f"));

    // Clean up
    fs::remove_file(&output_file).unwrap();
}

#[test]
fn test_call_flow_export_missing_bundle() {
    let output_file = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("test-no-bundle.md");

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("export")
        .arg("001a2f8d")
        .arg("--output")
        .arg(&output_file)
        .assert()
        .failure()
        .stderr(predicate::str::contains("Bundle path is required"));
}

#[test]
fn test_call_flow_invalid_format() {
    let test_file = get_test_data_path();

    Command::cargo_bin("log-scout")
        .unwrap()
        .arg("call-flow")
        .arg("show")
        .arg("001a2f8d")
        .arg("--bundle")
        .arg(&test_file)
        .arg("--format")
        .arg("invalid-format")
        .assert()
        .failure()
        .stderr(predicate::str::contains("Invalid format"));
}
