use pattern_engine::cause_codes::CauseCodeRegistry;

#[test]
fn test_ucm_cause_code_translation() {
    let registry = CauseCodeRegistry::new();

    // Load UCM cause codes
    registry
        .load_vendor("ucm")
        .expect("Failed to load UCM codes");

    // Test common codes
    assert_eq!(registry.translate("ucm", 0), Some("No error".to_string()));

    // Code 16 has extended explanation in actual data
    let code_16 = registry.translate("ucm", 16);
    assert!(code_16.is_some());
    assert!(code_16.unwrap().starts_with("Normal call clearing"));

    assert_eq!(registry.translate("ucm", 17), Some("User busy".to_string()));

    assert_eq!(
        registry.translate("ucm", 41),
        Some("Temporary failure".to_string())
    );
}

#[test]
fn test_unknown_cause_code() {
    let registry = CauseCodeRegistry::new();
    registry.load_vendor("ucm").unwrap();

    assert_eq!(registry.translate("ucm", 99999), None);
}

#[test]
fn test_multiple_vendors() {
    let registry = CauseCodeRegistry::new();

    registry.load_vendor("ucm").unwrap();
    registry.load_vendor("uccx").unwrap();

    assert!(registry.translate("ucm", 16).is_some());
    assert!(registry.translate("uccx", 1).is_some()); // UCCX starts at 1, not 0
}

#[test]
fn test_vendor_not_loaded() {
    let registry = CauseCodeRegistry::new();

    // Should return None if vendor not loaded
    assert_eq!(registry.translate("ucm", 16), None);
}

#[test]
fn test_is_vendor_loaded() {
    let registry = CauseCodeRegistry::new();

    assert!(!registry.is_vendor_loaded("ucm"));

    registry.load_vendor("ucm").unwrap();

    assert!(registry.is_vendor_loaded("ucm"));
}

#[test]
fn test_loaded_vendors() {
    let registry = CauseCodeRegistry::new();

    assert_eq!(registry.loaded_vendors().len(), 0);

    registry.load_vendor("ucm").unwrap();
    registry.load_vendor("uccx").unwrap();

    let vendors = registry.loaded_vendors();
    assert_eq!(vendors.len(), 2);
    assert!(vendors.contains(&"ucm".to_string()));
    assert!(vendors.contains(&"uccx".to_string()));
}

#[test]
fn test_search_by_description() {
    let registry = CauseCodeRegistry::new();
    registry.load_vendor("ucm").unwrap();

    let results = registry.search("ucm", "busy");
    assert!(!results.is_empty());

    // Should find "User busy" (code 17)
    assert!(results
        .iter()
        .any(|(code, desc)| { *code == 17 && desc.contains("busy") }));
}

#[test]
fn test_search_case_insensitive() {
    let registry = CauseCodeRegistry::new();
    registry.load_vendor("ucm").unwrap();

    let results_lower = registry.search("ucm", "busy");
    let results_upper = registry.search("ucm", "BUSY");
    let results_mixed = registry.search("ucm", "BuSy");

    assert_eq!(results_lower.len(), results_upper.len());
    assert_eq!(results_lower.len(), results_mixed.len());
}

#[test]
fn test_invalid_vendor() {
    let registry = CauseCodeRegistry::new();

    let result = registry.load_vendor("invalid_vendor");
    assert!(result.is_err());
}

#[test]
fn test_all_vendors_load() {
    let registry = CauseCodeRegistry::new();

    // All these should succeed
    assert!(registry.load_vendor("ucm").is_ok());
    assert!(registry.load_vendor("uccx").is_ok());
    assert!(registry.load_vendor("cvp").is_ok());
    assert!(registry.load_vendor("acs").is_ok());
    assert!(registry.load_vendor("ucce").is_ok());
}

#[test]
fn test_get_all_codes() {
    let registry = CauseCodeRegistry::new();
    registry.load_vendor("ucm").unwrap();

    let all_codes = registry.get_all_codes("ucm");
    assert!(all_codes.is_some());

    let codes = all_codes.unwrap();
    assert!(!codes.is_empty());
    assert!(codes.contains_key(&0));
    assert!(codes.contains_key(&16));
    assert!(codes.contains_key(&17));
}

#[test]
fn test_thread_safety() {
    use std::sync::Arc;
    use std::thread;

    let registry = Arc::new(CauseCodeRegistry::new());
    registry.load_vendor("ucm").unwrap();

    let mut handles = vec![];

    for _ in 0..10 {
        let reg = Arc::clone(&registry);
        let handle = thread::spawn(move || {
            let result = reg.translate("ucm", 16);
            assert!(result.is_some());
            assert!(result.unwrap().starts_with("Normal call clearing"));
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }
}
