#!/usr/bin/env python3
"""
RTMT Path Analyzer - Extract and Learn Log Paths from Real RTMT Archives

This script analyzes RTMT log archives to discover:
- All log file paths used in Cisco CUCM deployments
- Service-specific path patterns
- Component identification signatures
- File naming conventions

Output: Comprehensive path learning database for service detection
"""

import json
import os
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple


class RTMTPathAnalyzer:
    def __init__(self, rtmt_directory: str):
        self.rtmt_directory = rtmt_directory
        self.paths_by_service = defaultdict(set)
        self.all_paths = set()
        self.service_patterns = defaultdict(lambda: defaultdict(set))
        self.file_extensions = defaultdict(set)

    def analyze_all_archives(self):
        """Scan all ZIP files in the RTMT output directory"""
        print(f"🔍 Scanning: {self.rtmt_directory}\n")

        zip_files = list(Path(self.rtmt_directory).glob("*.zip"))
        print(f"📦 Found {len(zip_files)} RTMT archives\n")

        for zip_path in zip_files:
            self.analyze_archive(zip_path)

        self.generate_report()
        self.generate_json_database()

    def analyze_archive(self, zip_path: Path):
        """Extract paths from a single RTMT archive"""
        try:
            # Extract service name from filename
            service_name = self.extract_service_name(zip_path.name)

            with zipfile.ZipFile(zip_path, "r") as zf:
                for file_info in zf.filelist:
                    if not file_info.is_dir():
                        path = file_info.filename
                        self.all_paths.add(path)
                        self.paths_by_service[service_name].add(path)

                        # Extract path components for pattern learning
                        self.analyze_path_components(path, service_name)

        except Exception as e:
            print(f"⚠️  Error processing {zip_path.name}: {e}")

    def extract_service_name(self, filename: str) -> str:
        """Extract service name from RTMT archive filename"""
        # Pattern: timestamp_hostname_ServiceName.zip
        match = re.search(r"_([^_]+(?:_[^_]+)*)\.zip$", filename)
        if match:
            service = match.group(1)
            # Clean up common patterns
            service = service.replace(".ford.amer.wxc-di.webex.com", "")
            service = service.replace("c9402011ccm101", "")
            return service.strip("_")
        return "Unknown"

    def analyze_path_components(self, path: str, service: str):
        """Break down path into learnable components"""
        # Normalize path separators
        path = path.replace("\\", "/")

        # Extract directory structure
        parts = path.split("/")

        # Learn directory patterns
        for i, part in enumerate(parts[:-1]):  # Exclude filename
            depth = i
            self.service_patterns[service]["directories"].add(part)

            # Learn partial paths (signatures)
            if depth >= 1:
                partial_path = "/".join(parts[: depth + 1])
                self.service_patterns[service]["path_signatures"].add(partial_path)

        # Learn filename patterns
        filename = parts[-1] if parts else path
        self.service_patterns[service]["filenames"].add(filename)

        # Extract file extension
        if "." in filename:
            ext = filename.split(".")[-1]
            self.file_extensions[service].add(ext)

        # Learn base path patterns (first 2-3 levels)
        if len(parts) >= 3:
            base_path = "/".join(parts[:3])
            self.service_patterns[service]["base_paths"].add(base_path)

    def generate_report(self):
        """Generate human-readable analysis report"""
        print("\n" + "=" * 80)
        print("📊 RTMT PATH ANALYSIS REPORT")
        print("=" * 80 + "\n")

        print(f"📈 Summary:")
        print(f"   • Total unique paths: {len(self.all_paths)}")
        print(f"   • Services detected: {len(self.paths_by_service)}")
        print()

        # Service-by-service breakdown
        for service in sorted(self.paths_by_service.keys()):
            paths = self.paths_by_service[service]
            print(f"\n🔧 {service}")
            print(f"   Files: {len(paths)}")

            # Show base paths
            base_paths = self.service_patterns[service]["base_paths"]
            if base_paths:
                print(f"   Base Paths:")
                for bp in sorted(base_paths)[:5]:  # Top 5
                    print(f"      • {bp}")

            # Show file extensions
            exts = self.file_extensions[service]
            if exts:
                print(f"   Extensions: {', '.join(sorted(exts))}")

            # Show sample files
            print(f"   Sample files:")
            for path in sorted(paths)[:3]:
                print(f"      • {path}")

        self.generate_signature_analysis()

    def generate_signature_analysis(self):
        """Identify unique signatures for service detection"""
        print("\n" + "=" * 80)
        print("🎯 SERVICE DETECTION SIGNATURES")
        print("=" * 80 + "\n")

        # Find unique path components per service
        all_dirs = defaultdict(set)
        for service, patterns in self.service_patterns.items():
            for directory in patterns["directories"]:
                all_dirs[directory].add(service)

        # Find service-specific directories
        for service in sorted(self.paths_by_service.keys()):
            print(f"\n✅ {service}:")

            unique_dirs = set()
            for directory in self.service_patterns[service]["directories"]:
                if len(all_dirs[directory]) == 1:  # Unique to this service
                    unique_dirs.add(directory)

            if unique_dirs:
                print(f"   Unique path components:")
                for dir_name in sorted(unique_dirs)[:10]:
                    print(f"      • {dir_name}")

            # Find common path patterns
            base_paths = self.service_patterns[service]["base_paths"]
            if base_paths:
                print(f"   Common base paths:")
                for bp in sorted(base_paths)[:3]:
                    print(f"      • {bp}/")

    def generate_json_database(self):
        """Generate JSON database for path signature learning"""
        database = {
            "metadata": {
                "source": "Real RTMT Archives",
                "total_paths": len(self.all_paths),
                "services_count": len(self.paths_by_service),
                "generated_by": "analyze_rtmt_paths.py",
            },
            "services": {},
        }

        for service, paths in self.paths_by_service.items():
            patterns = self.service_patterns[service]

            database["services"][service] = {
                "file_count": len(paths),
                "base_paths": sorted(patterns["base_paths"]),
                "path_signatures": sorted(patterns["path_signatures"])[:20],  # Top 20
                "unique_directories": sorted(patterns["directories"]),
                "filename_patterns": sorted(patterns["filenames"])[:50],  # Top 50
                "file_extensions": sorted(self.file_extensions[service]),
                "sample_full_paths": sorted(paths)[:10],  # 10 examples
            }

        # Save to JSON file
        output_file = Path(self.rtmt_directory) / "rtmt_path_database.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(database, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Saved database to: {output_file}")

        # Also save a learning signatures file
        self.generate_learning_signatures(database)

    def generate_learning_signatures(self, database: dict):
        """Generate a clean signature file for pattern matching"""
        signatures = {
            "version": "1.0",
            "learned_from": "RTMT Archives",
            "signatures": {},
        }

        for service, data in database["services"].items():
            # Extract key patterns for detection
            key_patterns = set()

            # Add base paths
            for bp in data["base_paths"][:5]:
                key_patterns.add(bp)

            # Add unique directories
            for dir_name in data["unique_directories"][:10]:
                if len(dir_name) > 3:  # Avoid generic names
                    key_patterns.add(f"/{dir_name}/")

            signatures["signatures"][service] = {
                "confidence": "high" if len(key_patterns) >= 3 else "medium",
                "path_patterns": sorted(key_patterns),
                "extensions": data["file_extensions"],
                "sample_files": data["sample_full_paths"][:3],
            }

        output_file = Path(self.rtmt_directory) / "rtmt_signatures.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(signatures, f, indent=2, ensure_ascii=False)

        print(f"🎯 Saved signatures to: {output_file}")

    def generate_markdown_report(self):
        """Generate a detailed Markdown report"""
        output = []
        output.append("# 🧠 RTMT Path Learning Database - Real World Data\n")
        output.append(
            f"**Generated from**: {len(self.paths_by_service)} RTMT services\n"
        )
        output.append(f"**Total paths analyzed**: {len(self.all_paths)}\n")
        output.append(f"**Date**: {Path(self.rtmt_directory).stat().st_mtime}\n\n")
        output.append("---\n\n")

        output.append("## 📊 Service Detection Patterns\n\n")

        for service in sorted(self.paths_by_service.keys()):
            output.append(f"### {service}\n\n")

            patterns = self.service_patterns[service]
            paths = self.paths_by_service[service]

            output.append(f"**Files**: {len(paths)}\n\n")

            # Base paths
            if patterns["base_paths"]:
                output.append("**Base Paths**:\n")
                for bp in sorted(patterns["base_paths"])[:10]:
                    output.append(f"- `{bp}/`\n")
                output.append("\n")

            # Extensions
            if self.file_extensions[service]:
                exts = ", ".join(
                    f"`{e}`" for e in sorted(self.file_extensions[service])
                )
                output.append(f"**Extensions**: {exts}\n\n")

            # Sample paths
            output.append("**Sample Paths**:\n")
            output.append("```\n")
            for path in sorted(paths)[:5]:
                output.append(f"{path}\n")
            output.append("```\n\n")

            output.append("---\n\n")

        # Save markdown
        md_file = Path(self.rtmt_directory) / "RTMT_PATH_ANALYSIS.md"
        with open(md_file, "w", encoding="utf-8") as f:
            f.writelines(output)

        print(f"📝 Saved markdown report to: {md_file}")


def main():
    rtmt_dir = r"C:\Users\mitchong\Downloads\RTMToutput"

    if not os.path.exists(rtmt_dir):
        print(f"❌ Directory not found: {rtmt_dir}")
        return

    analyzer = RTMTPathAnalyzer(rtmt_dir)
    analyzer.analyze_all_archives()
    analyzer.generate_markdown_report()

    print("\n✅ Analysis complete!")
    print("\n📄 Generated files:")
    print("   • rtmt_path_database.json    - Complete path database")
    print("   • rtmt_signatures.json       - Service detection signatures")
    print("   • RTMT_PATH_ANALYSIS.md      - Human-readable report")
    print("\n🎯 Use these files to improve service detection accuracy!")


if __name__ == "__main__":
    main()
