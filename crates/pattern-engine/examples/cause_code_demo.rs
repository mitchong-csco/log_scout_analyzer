use pattern_engine::cause_codes::CauseCodeRegistry;

fn main() {
    println!("=== Cisco Cause Code Translation Demo ===\n");

    let registry = CauseCodeRegistry::new();

    // Load UCM codes
    println!("📥 Loading UCM cause codes...");
    match registry.load_vendor("ucm") {
        Ok(_) => println!("✅ UCM cause codes loaded successfully\n"),
        Err(e) => {
            eprintln!("❌ Failed to load UCM codes: {}", e);
            return;
        }
    }

    // Test translations
    let test_codes = vec![0, 16, 17, 18, 28, 41, 47, 58];

    println!("{}", "=".repeat(80));
    println!("UCM Cause Code Translations:");
    println!("{}", "=".repeat(80));

    for code in test_codes {
        match registry.translate("ucm", code) {
            Some(desc) => {
                // Truncate long descriptions for display
                let display_desc = if desc.len() > 60 {
                    format!("{}...", &desc[..57])
                } else {
                    desc
                };
                println!("{:3} - {}", code, display_desc);
            }
            None => println!("{:3} - [Unknown]", code),
        }
    }

    // Search functionality
    println!("\n{}", "=".repeat(80));
    println!("Searching for 'busy' in UCM codes:");
    println!("{}", "=".repeat(80));
    let results = registry.search("ucm", "busy");
    for (code, desc) in results {
        let display_desc = if desc.len() > 60 {
            format!("{}...", &desc[..57])
        } else {
            desc
        };
        println!("{:3} - {}", code, display_desc);
    }

    // Load and demonstrate multiple vendors
    println!("\n{}", "=".repeat(80));
    println!("Loading additional vendors...");
    println!("{}", "=".repeat(80));

    for vendor in &["uccx", "cvp", "acs"] {
        match registry.load_vendor(vendor) {
            Ok(_) => println!("✅ {} loaded", vendor.to_uppercase()),
            Err(e) => println!("⚠️  {} failed: {}", vendor.to_uppercase(), e),
        }
    }

    // Show loaded vendors
    println!("\n{}", "=".repeat(80));
    println!("Loaded Vendors:");
    println!("{}", "=".repeat(80));
    let vendors = registry.loaded_vendors();
    for vendor in vendors {
        let codes = registry.get_all_codes(&vendor);
        let count = codes.map(|c| c.len()).unwrap_or(0);
        println!("  • {} ({} codes)", vendor.to_uppercase(), count);
    }

    // Demo UCCX codes
    println!("\n{}", "=".repeat(80));
    println!("UCCX Cause Code Sample:");
    println!("{}", "=".repeat(80));
    for code in 1..=5 {
        if let Some(desc) = registry.translate("uccx", code) {
            println!("{:3} - {}", code, desc);
        }
    }

    println!("\n{}", "=".repeat(80));
    println!("✨ Demo complete!");
    println!("{}", "=".repeat(80));
}
