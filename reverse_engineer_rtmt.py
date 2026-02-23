#!/usr/bin/env python3
r"""
RTMT Reverse Engineering Tool - Extract Log Path Configurations

This script analyzes the Cisco RTMT application files to discover:
- Service definitions and log collection paths
- Trace configurations and file patterns
- Alert definitions and thresholds
- Performance counter configurations

Usage:
    python reverse_engineer_rtmt.py "C:\Users\mitchong\Downloads\CiscoRTMTPlugin"
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set


class RTMTReverseEngineer:
    def __init__(self, rtmt_path: str):
        self.rtmt_path = Path(rtmt_path)
        self.services = defaultdict(dict)
        self.log_paths = defaultdict(set)
        self.trace_configs = {}
        self.file_patterns = defaultdict(set)
        self.service_names = set()

    def analyze(self):
        """Main analysis entry point"""
        print(f"🔍 Analyzing RTMT installation at: {self.rtmt_path}\n")

        # Step 1: Analyze XML configurations
        self.analyze_xml_configs()

        # Step 2: Extract from JAR files
        self.extract_from_jars()

        # Step 3: Analyze properties files
        self.analyze_properties()

        # Step 4: Search for hardcoded paths in class files
        self.search_class_files()

        # Step 5: Generate reports
        self.generate_reports()

    def analyze_xml_configs(self):
        """Analyze XML configuration files"""
        print("📋 Analyzing XML configurations...")

        xml_files = [
            self.rtmt_path / "TraceConfig.xml",
            self.rtmt_path / "ReportConfig.xml",
            self.rtmt_path / "viewers.xml",
            self.rtmt_path / "extensiontoviewer.xml",
            self.rtmt_path / "conf" / "rtmt.xml",
        ]

        for xml_file in xml_files:
            if xml_file.exists():
                try:
                    print(f"   → {xml_file.name}")
                    self.parse_xml_file(xml_file)
                except Exception as e:
                    print(f"   ⚠️  Error parsing {xml_file.name}: {e}")

        # Check clavConfig directory
        clav_dir = self.rtmt_path / "clavConfig"
        if clav_dir.exists():
            for xml_file in clav_dir.glob("*.xml"):
                try:
                    print(f"   → clavConfig/{xml_file.name}")
                    self.parse_xml_file(xml_file)
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")

    def parse_xml_file(self, xml_file: Path):
        """Parse individual XML file for service and path information"""
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()

            # Extract trace configurations
            if xml_file.name == "TraceConfig.xml":
                self.parse_trace_config(root)

            # Extract viewer configurations
            elif xml_file.name == "viewers.xml":
                self.parse_viewers_config(root)

            # Extract extension mappings
            elif xml_file.name == "extensiontoviewer.xml":
                self.parse_extension_mappings(root)

            # Extract global configs
            elif xml_file.name == "rtmt.xml":
                self.parse_rtmt_config(root)

        except ET.ParseError as e:
            print(f"   ⚠️  XML parse error: {e}")

    def parse_trace_config(self, root):
        """Parse TraceConfig.xml for file patterns and parsers"""
        for trace in root.findall(".//Trace"):
            parser = trace.find("ParserClass")
            identifier = trace.find(".//FileStartWith")

            if parser is not None and identifier is not None:
                parser_name = parser.text
                file_pattern = identifier.text

                self.trace_configs[file_pattern] = {
                    "parser": parser_name,
                    "file_starts_with": file_pattern,
                }

                self.file_patterns["trace_files"].add(file_pattern)

                print(f"      ✓ Trace: {file_pattern}* → {parser_name}")

    def parse_viewers_config(self, root):
        """Parse viewers.xml for service definitions"""
        # Look for service names and viewer types
        for viewer in root.findall(".//Viewer"):
            name = viewer.get("name", "")
            viewer_type = viewer.get("type", "")

            if name:
                self.service_names.add(name)
                print(f"      ✓ Viewer: {name} ({viewer_type})")

    def parse_extension_mappings(self, root):
        """Parse extensiontoviewer.xml for file extension mappings"""
        for mapping in root.findall(".//Mapping"):
            extension = mapping.get("extension", "")
            viewer = mapping.get("viewer", "")

            if extension:
                self.file_patterns["extensions"].add(extension)
                print(f"      ✓ Extension: .{extension} → {viewer}")

    def parse_rtmt_config(self, root):
        """Parse rtmt.xml for global paths and settings"""
        trace_path = root.find(".//TraceDnldPath")
        if trace_path is not None and trace_path.text:
            print(f"      ✓ Trace Download Path: {trace_path.text}")
            self.log_paths["download_path"].add(trace_path.text)

    def extract_from_jars(self):
        """Extract configuration from JAR files"""
        print("\n📦 Analyzing JAR files...")

        jar_files = [
            self.rtmt_path / "JRtmt.jar",
        ]

        # Also check lib directory
        lib_dir = self.rtmt_path / "lib"
        if lib_dir.exists():
            jar_files.extend(lib_dir.glob("*.jar"))

        for jar_file in jar_files:
            if (
                jar_file.exists() and jar_file.stat().st_size < 50 * 1024 * 1024
            ):  # Skip very large JARs
                try:
                    print(f"   → {jar_file.name}")
                    self.analyze_jar(jar_file)
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")

    def analyze_jar(self, jar_file: Path):
        """Analyze individual JAR file"""
        try:
            with zipfile.ZipFile(jar_file, "r") as zf:
                # Look for XML and properties files
                for file_info in zf.filelist:
                    filename = file_info.filename.lower()

                    # Extract XML files
                    if filename.endswith(".xml"):
                        try:
                            content = zf.read(file_info.filename).decode(
                                "utf-8", errors="ignore"
                            )
                            self.extract_paths_from_content(content, file_info.filename)
                        except Exception:
                            pass

                    # Extract properties files
                    elif filename.endswith(".properties"):
                        try:
                            content = zf.read(file_info.filename).decode(
                                "utf-8", errors="ignore"
                            )
                            self.extract_paths_from_content(content, file_info.filename)
                        except Exception:
                            pass

                    # Extract from class files (strings)
                    elif filename.endswith(".class") and "service" in filename:
                        try:
                            content = zf.read(file_info.filename)
                            self.extract_strings_from_class(content)
                        except Exception:
                            pass
        except zipfile.BadZipFile:
            print(f"   ⚠️  Not a valid ZIP file")

    def extract_paths_from_content(self, content: str, filename: str):
        """Extract log paths from file content"""
        # Pattern: /var/log, /active/, etc.
        path_patterns = [
            r"/(?:var/log|active|opt/cisco|usr/local)/[a-zA-Z0-9_/\-\.]+",
            r"active/[a-zA-Z0-9_/\-\.]+",
            r"tomcat/logs/[a-zA-Z0-9_/\-\.]+",
            r"cm/trace/[a-zA-Z0-9_/\-\.]+",
            r"platform/[a-zA-Z0-9_/\-\.]+",
        ]

        for pattern in path_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if len(match) > 10 and not match.endswith(".class"):
                    self.log_paths["discovered"].add(match)

    def extract_strings_from_class(self, class_bytes: bytes):
        """Extract printable strings from class files"""
        # Simple string extraction from bytecode
        strings = re.findall(b"[\x20-\x7e]{10,}", class_bytes)

        for string in strings:
            try:
                text = string.decode("utf-8")
                # Look for path-like strings
                if "/" in text and any(
                    keyword in text.lower()
                    for keyword in ["log", "trace", "active", "var"]
                ):
                    self.log_paths["discovered"].add(text)
            except:
                pass

    def analyze_properties(self):
        """Analyze properties files"""
        print("\n⚙️  Analyzing properties files...")

        conf_dir = self.rtmt_path / "conf"
        if conf_dir.exists():
            for prop_file in conf_dir.glob("*.properties"):
                print(f"   → {prop_file.name}")
                try:
                    with open(prop_file, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        self.extract_paths_from_content(content, prop_file.name)
                except Exception as e:
                    print(f"   ⚠️  Error: {e}")

    def search_class_files(self):
        """Search for hardcoded paths in extracted classes"""
        print("\n🔍 Searching for hardcoded paths in JARs...")

        # This is done during JAR extraction
        if self.log_paths["discovered"]:
            print(f"   ✓ Found {len(self.log_paths['discovered'])} potential paths")

    def generate_reports(self):
        """Generate analysis reports"""
        print("\n" + "=" * 80)
        print("📊 RTMT REVERSE ENGINEERING REPORT")
        print("=" * 80 + "\n")

        # Summary
        print(f"📈 Summary:")
        print(f"   • Trace file patterns: {len(self.trace_configs)}")
        print(f"   • Service names found: {len(self.service_names)}")
        print(f"   • File extensions: {len(self.file_patterns['extensions'])}")
        print(f"   • Discovered paths: {len(self.log_paths['discovered'])}")
        print()

        # Trace configurations
        if self.trace_configs:
            print("🔍 Trace File Patterns:")
            for pattern, config in sorted(self.trace_configs.items()):
                print(f"   • {pattern}* → Parser: {config['parser']}")
            print()

        # File extensions
        if self.file_patterns["extensions"]:
            print("📄 Supported File Extensions:")
            for ext in sorted(self.file_patterns["extensions"]):
                print(f"   • .{ext}")
            print()

        # Service names
        if self.service_names:
            print("🔧 Service Names:")
            for name in sorted(self.service_names):
                print(f"   • {name}")
            print()

        # Discovered paths
        if self.log_paths["discovered"]:
            print("📁 Discovered Log Paths:")
            # Filter and clean paths
            valid_paths = set()
            for path in self.log_paths["discovered"]:
                # Clean up the path
                path = path.strip()
                if len(path) > 10 and len(path) < 200:
                    # Must look like a real path
                    if "/" in path and not any(
                        skip in path
                        for skip in ["http://", "https://", "class", "java"]
                    ):
                        valid_paths.add(path)

            for path in sorted(valid_paths):
                print(f"   • {path}")
            print()

        # Generate JSON output
        self.generate_json_output()

        # Generate enhanced signatures
        self.generate_enhanced_signatures()

    def generate_json_output(self):
        """Generate JSON output file"""
        output = {
            "source": "RTMT Reverse Engineering",
            "rtmt_path": str(self.rtmt_path),
            "trace_configs": self.trace_configs,
            "file_patterns": {k: list(v) for k, v in self.file_patterns.items()},
            "service_names": sorted(self.service_names),
            "discovered_paths": sorted(self.log_paths["discovered"]),
        }

        output_file = self.rtmt_path / "rtmt_reverse_engineered.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"💾 Saved JSON to: {output_file}")

    def generate_enhanced_signatures(self):
        """Generate enhanced signature file combining real data + RTMT configs"""
        print("\n🎯 Generating Enhanced Signatures...")

        # Load existing signatures if available
        existing_sigs = {}
        sig_file = Path(r"C:\Users\mitchong\Downloads\RTMToutput\rtmt_signatures.json")
        if sig_file.exists():
            try:
                with open(sig_file, "r", encoding="utf-8") as f:
                    existing_sigs = json.load(f)
                print(f"   ✓ Loaded existing signatures from {sig_file.name}")
            except:
                pass

        # Add trace file patterns to signatures
        enhanced = {
            "version": "2.1",
            "source": "Real RTMT Archives + RTMT App Configuration",
            "trace_file_patterns": {},
            "file_extensions": sorted(self.file_patterns.get("extensions", [])),
            "service_names": sorted(self.service_names),
        }

        # Add trace patterns
        for pattern, config in self.trace_configs.items():
            enhanced["trace_file_patterns"][pattern] = {
                "file_starts_with": pattern,
                "parser": config["parser"],
                "confidence": 100,
            }

        # Merge with existing signatures
        if existing_sigs:
            enhanced["existing_signatures"] = existing_sigs.get("signatures", {})

        output_file = self.rtmt_path / "rtmt_enhanced_signatures.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(enhanced, f, indent=2, ensure_ascii=False)

        print(f"💾 Saved enhanced signatures to: {output_file}")

        # Generate markdown report
        self.generate_markdown_report(enhanced)

    def generate_markdown_report(self, enhanced_data: dict):
        """Generate detailed markdown report"""
        output = []
        output.append("# 🔍 RTMT Reverse Engineering Report\n")
        output.append(f"**Source**: Cisco RTMT Application\n")
        output.append(f"**Path**: `{self.rtmt_path}`\n")
        output.append(f"**Date**: {Path(__file__).stat().st_mtime}\n\n")
        output.append("---\n\n")

        # Trace file patterns
        output.append("## 📋 Trace File Patterns\n\n")
        output.append(
            "These patterns are used by RTMT to identify and parse log files:\n\n"
        )
        output.append("| File Pattern | Parser Class | Description |\n")
        output.append("|--------------|--------------|-------------|\n")

        for pattern, config in sorted(self.trace_configs.items()):
            output.append(
                f"| `{pattern}*` | {config['parser']} | Files starting with '{pattern}' |\n"
            )

        output.append("\n")

        # File extensions
        if self.file_patterns.get("extensions"):
            output.append("## 📄 Supported File Extensions\n\n")
            output.append("RTMT can view these file types:\n\n")
            for ext in sorted(self.file_patterns["extensions"]):
                output.append(f"- `.{ext}`\n")
            output.append("\n")

        # Service names
        if self.service_names:
            output.append("## 🔧 Service Names\n\n")
            output.append("Services that RTMT can monitor:\n\n")
            for name in sorted(self.service_names):
                output.append(f"- {name}\n")
            output.append("\n")

        # Discovered paths
        if self.log_paths.get("discovered"):
            output.append("## 📁 Discovered Log Paths\n\n")
            output.append("Paths found in RTMT configuration and code:\n\n")
            output.append("```\n")
            valid_paths = [
                p
                for p in sorted(self.log_paths["discovered"])
                if len(p) > 10 and len(p) < 200 and "/" in p
            ]
            for path in valid_paths[:50]:  # Limit to 50
                output.append(f"{path}\n")
            output.append("```\n\n")

        # How to use
        output.append("## 🎯 How to Use This Information\n\n")
        output.append("### 1. File Pattern Detection\n\n")
        output.append("Use the trace file patterns to identify log types:\n\n")
        output.append("```python\n")
        output.append("def detect_log_type(filename):\n")
        output.append("    if filename.startswith('sdi'):\n")
        output.append("        return 'SDI Trace', 'SDIParser'\n")
        output.append("    elif filename.startswith('sdl'):\n")
        output.append("        return 'SDL Trace', 'SDLParser'\n")
        output.append("    elif filename.startswith('syslog'):\n")
        output.append("        return 'Syslog', 'LogParser'\n")
        output.append("```\n\n")

        output.append("### 2. Enhanced Service Detection\n\n")
        output.append("Combine with existing path signatures for better accuracy.\n\n")

        output.append("---\n\n")
        output.append("**Generated by**: `reverse_engineer_rtmt.py`\n")

        md_file = self.rtmt_path / "RTMT_REVERSE_ENGINEERING_REPORT.md"
        with open(md_file, "w", encoding="utf-8") as f:
            f.writelines(output)

        print(f"📝 Saved markdown report to: {md_file}")


def main():
    if len(sys.argv) < 2:
        rtmt_path = r"C:\Users\mitchong\Downloads\CiscoRTMTPlugin"
    else:
        rtmt_path = sys.argv[1]

    if not os.path.exists(rtmt_path):
        print(f"❌ RTMT path not found: {rtmt_path}")
        print(f"\nUsage: python {sys.argv[0]} <path_to_rtmt>")
        sys.exit(1)

    analyzer = RTMTReverseEngineer(rtmt_path)
    analyzer.analyze()

    print("\n✅ Analysis complete!")
    print("\n📄 Generated files:")
    print("   • rtmt_reverse_engineered.json      - Raw extraction data")
    print("   • rtmt_enhanced_signatures.json     - Enhanced detection signatures")
    print("   • RTMT_REVERSE_ENGINEERING_REPORT.md - Human-readable report")
    print("\n🎯 These files complement the path learning from real archives!")


if __name__ == "__main__":
    main()
