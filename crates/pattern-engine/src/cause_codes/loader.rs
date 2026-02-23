use super::{CauseCodeError, Result};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// Load a Java properties file into a HashMap<u32, String>
///
/// Format: `<code> = <description>`
/// Example: `16 = Normal call clearing`
pub fn load_properties_file<P: AsRef<Path>>(path: P) -> Result<HashMap<u32, String>> {
    let path = path.as_ref();

    let file = File::open(path)
        .map_err(|e| CauseCodeError::LoadError(format!("Cannot open {}: {}", path.display(), e)))?;

    let reader = BufReader::new(file);
    let mut codes = HashMap::new();

    for (line_num, line) in reader.lines().enumerate() {
        let line = line?;
        let line = line.trim();

        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Parse: "code = description"
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();

            // Parse code as u32
            match key.parse::<u32>() {
                Ok(code) => {
                    codes.insert(code, value.to_string());
                }
                Err(_) => {
                    // Skip invalid lines (might be headers or other content)
                    eprintln!(
                        "Warning: Skipping invalid line {} in {}: {}",
                        line_num + 1,
                        path.display(),
                        line
                    );
                }
            }
        }
    }

    Ok(codes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_properties_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "# Test properties file").unwrap();
        writeln!(temp_file, "0 = No error").unwrap();
        writeln!(temp_file, "16 = Normal call clearing").unwrap();
        writeln!(temp_file, "").unwrap();
        writeln!(temp_file, "17 = User busy").unwrap();
        temp_file.flush().unwrap();

        let codes = load_properties_file(temp_file.path()).unwrap();

        assert_eq!(codes.len(), 3);
        assert_eq!(codes.get(&0), Some(&"No error".to_string()));
        assert_eq!(codes.get(&16), Some(&"Normal call clearing".to_string()));
        assert_eq!(codes.get(&17), Some(&"User busy".to_string()));
    }

    #[test]
    fn test_load_invalid_file() {
        let result = load_properties_file("/nonexistent/file.properties");
        assert!(result.is_err());
    }

    #[test]
    fn test_skip_comments_and_empty_lines() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "# This is a comment").unwrap();
        writeln!(temp_file, "").unwrap();
        writeln!(temp_file, "0 = No error").unwrap();
        writeln!(temp_file, "# Another comment").unwrap();
        writeln!(temp_file, "16 = Normal call clearing").unwrap();
        temp_file.flush().unwrap();

        let codes = load_properties_file(temp_file.path()).unwrap();

        assert_eq!(codes.len(), 2);
    }

    #[test]
    fn test_handle_whitespace() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "  0  =  No error  ").unwrap();
        writeln!(temp_file, "16=Normal call clearing").unwrap();
        temp_file.flush().unwrap();

        let codes = load_properties_file(temp_file.path()).unwrap();

        assert_eq!(codes.get(&0), Some(&"No error".to_string()));
        assert_eq!(codes.get(&16), Some(&"Normal call clearing".to_string()));
    }
}
