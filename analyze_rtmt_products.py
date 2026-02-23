#!/usr/bin/env python3
"""
RTMT Multi-Product Support Analyzer

Analyzes RTMT installations to discover ALL supported products:
- CUCM (Unified Communications Manager)
- CUP (Cisco Unified Presence)
- Unity Connection
- UCCX (Unified Contact Center Express)
- UCCE (Unified Contact Center Enterprise)
- Emergency Responder
- IM&P (IM and Presence)
- And any other products

Examines:
- Plugin classes in AST.jar
- ViewConfig styles
- Property files (cause codes, etc.)
- Class names and packages
"""

import json
import os
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set


class RTMTProductAnalyzer:
    def __init__(self, rtmt_path: str):
        self.rtmt_path = Path(rtmt_path)
        self.products = defaultdict(lambda: defaultdict(set))
        self.plugins = defaultdict(set)
        self.view_configs = set()
        self.property_files = set()

    def analyze(self):
        """Main analysis entry point"""
        print(f"🔍 Analyzing RTMT for multi-product support: {self.rtmt_path}\n")

        # Step 1: Analyze viewConfig directories
        self.analyze_view_configs()

        # Step 2: Analyze property files (cause codes)
        self.analyze_properties()

        # Step 3: Extract from JAR files
        self.analyze_jars()

        # Step 4: Generate comprehensive report
        self.generate_report()

    def analyze_view_configs(self):
        """Check viewConfig/styles for product directories"""
        print("📁 Analyzing viewConfig/styles...")

        styles_dir = self.rtmt_path / "viewConfig" / "styles"
        if styles_dir.exists():
            for item in styles_dir.iterdir():
                if item.is_dir():
                    product = item.name
                    self.view_configs.add(product)
                    self.products[product]["view_style"].add(str(item))
                    print(f"   ✓ Found style for: {product}")

    def analyze_properties(self):
        """Analyze property files for product hints"""
        print("\n⚙️  Analyzing property files...")

        conf_dir = self.rtmt_path / "conf"
        if conf_dir.exists():
            for prop_file in conf_dir.glob("*.properties"):
                self.property_files.add(prop_file.name)

                # Extract product from filename
                if "uccx" in prop_file.name.lower():
                    self.products["uccx"]["properties"].add(prop_file.name)
                    print(f"   ✓ UCCX: {prop_file.name}")
                elif "ucce" in prop_file.name.lower():
                    self.products["ucce"]["properties"].add(prop_file.name)
                    print(f"   ✓ UCCE: {prop_file.name}")
                elif "ucm" in prop_file.name.lower():
                    self.products["ucm"]["properties"].add(prop_file.name)
                    print(f"   ✓ UCM: {prop_file.name}")
                elif "acs" in prop_file.name.lower():
                    self.products["acs"]["properties"].add(prop_file.name)
                    print(f"   ✓ ACS: {prop_file.name}")
                elif "cvp" in prop_file.name.lower():
                    self.products["cvp"]["properties"].add(prop_file.name)
                    print(f"   ✓ CVP: {prop_file.name}")
                elif "ea" in prop_file.name.lower():
                    self.products["ea"]["properties"].add(prop_file.name)
                    print(f"   ✓ EA (Emergency Responder): {prop_file.name}")

    def analyze_jars(self):
        """Extract product-specific classes from JAR files"""
        print("\n📦 Analyzing JAR files for product-specific code...")

        jar_files = [self.rtmt_path / "global" / "AST.jar"]

        for jar_file in jar_files:
            if jar_file.exists():
                print(f"\n   → Analyzing {jar_file.name}")
                self.analyze_jar(jar_file)

    def analyze_jar(self, jar_file: Path):
        """Analyze individual JAR for product classes"""
        try:
            with zipfile.ZipFile(jar_file, "r") as zf:
                class_files = [
                    f.filename for f in zf.filelist if f.filename.endswith(".class")
                ]

                # Search for product-specific patterns
                product_patterns = {
                    "cup": r"(?i)cup(?!board)",  # CUP but not cupboard
                    "uccx": r"(?i)uccx",
                    "ucce": r"(?i)ucce",
                    "unity": r"(?i)unity",
                    "cuc": r"(?i)cuc(?!m)",  # CUC but not cucm
                    "imp": r"(?i)imp(?!ort)",  # IMP but not import
                    "emergency": r"(?i)emergency|(?i)emer(?:g)?responder",
                    "icm": r"(?i)icm",
                    "cvp": r"(?i)cvp",
                    "acs": r"(?i)acs",
                }

                for product, pattern in product_patterns.items():
                    matching = [cf for cf in class_files if re.search(pattern, cf)]
                    if matching:
                        print(
                            f"      ✓ {product.upper()}: Found {len(matching)} classes"
                        )
                        for match in matching[:5]:  # Show first 5
                            class_name = match.split("/")[-1].replace(".class", "")
                            self.products[product]["classes"].add(class_name)
                            print(f"         - {class_name}")
                        if len(matching) > 5:
                            print(f"         ... and {len(matching) - 5} more")

                        # Store all matches
                        for match in matching:
                            self.products[product]["all_classes"].add(match)

                # Special check for plugins
                plugin_classes = [
                    cf
                    for cf in class_files
                    if "plugin" in cf.lower() and "Plugin" in cf
                ]
                for pc in plugin_classes:
                    if "Cup" in pc:
                        self.plugins["cup"].add(pc)
                    elif any(
                        prod in pc.lower() for prod in ["uccx", "ucce", "unity", "imp"]
                    ):
                        for prod in ["uccx", "ucce", "unity", "imp"]:
                            if prod in pc.lower():
                                self.plugins[prod].add(pc)

        except Exception as e:
            print(f"      ⚠️  Error: {e}")

    def generate_report(self):
        """Generate comprehensive multi-product report"""
        print("\n" + "=" * 80)
        print("📊 RTMT MULTI-PRODUCT SUPPORT REPORT")
        print("=" * 80 + "\n")

        # Summary
        print(f"📈 Summary:")
        print(f"   • ViewConfig styles: {len(self.view_configs)}")
        print(f"   • Property files: {len(self.property_files)}")
        print(f"   • Products detected: {len(self.products)}")
        print()

        # Product breakdown
        print("🔍 Detected Products:\n")

        # Map short codes to full names
        product_names = {
            "ucm": "Unified Communications Manager (CUCM)",
            "cucmbe": "CUCM Business Edition",
            "cup": "Cisco Unified Presence",
            "uc": "Unity Connection",
            "uccx": "Unified Contact Center Express",
            "ucce": "Unified Contact Center Enterprise",
            "icm": "Intelligent Contact Management",
            "ea": "Emergency Responder",
            "imp": "IM and Presence",
            "acs": "Access Control Server",
            "cvp": "Customer Voice Portal",
            "unity": "Unity Connection",
            "cuc": "Cisco Unity Connection",
        }

        # Sort products by evidence strength
        for product in sorted(self.products.keys()):
            full_name = product_names.get(product, product.upper())
            evidence = self.products[product]

            print(f"### {full_name} ({product.upper()})")

            # View config
            if evidence["view_style"]:
                print(f"   ✓ ViewConfig style: YES")

            # Properties
            if evidence["properties"]:
                print(f"   ✓ Property files: {', '.join(evidence['properties'])}")

            # Classes
            if evidence["classes"]:
                print(
                    f"   ✓ Code classes: {len(evidence['all_classes'])} classes found"
                )
                print(f"      Examples: {', '.join(list(evidence['classes'])[:3])}")

            # Plugins
            if product in self.plugins and self.plugins[product]:
                print(f"   ✓ Plugin support: {len(self.plugins[product])} plugins")

            # Assessment
            evidence_count = (
                (1 if evidence["view_style"] else 0)
                + (1 if evidence["properties"] else 0)
                + (1 if evidence["classes"] else 0)
                + (1 if product in self.plugins and self.plugins[product] else 0)
            )

            if evidence_count >= 3:
                status = "🟢 FULL SUPPORT"
            elif evidence_count >= 2:
                status = "🟡 PARTIAL SUPPORT"
            elif evidence_count >= 1:
                status = "🟠 LIMITED SUPPORT"
            else:
                status = "⚪ MINIMAL SUPPORT"

            print(f"   {status}")
            print()

        # Expected log paths
        self.generate_expected_paths()

        # Generate JSON
        self.generate_json()

        # Generate markdown
        self.generate_markdown()

    def generate_expected_paths(self):
        """Generate expected log paths for each product"""
        print("\n" + "=" * 80)
        print("📁 EXPECTED LOG PATH PATTERNS BY PRODUCT")
        print("=" * 80 + "\n")

        path_expectations = {
            "ucm": {
                "base": "/var/log/active/",
                "paths": [
                    "cm/trace/ccm/",
                    "cm/trace/sdl/",
                    "tomcat/logs/axl-tomcat/",
                    "tomcat/logs/uds-tomcat/",
                    "platform/log/",
                ],
            },
            "cup": {
                "base": "/var/log/active/",
                "paths": [
                    "xcp/log/",
                    "xcp/trace/",
                    "tomcat/logs/cups-xmpp/",
                    "tomcat/logs/cups-sip/",
                    "tomcat/logs/syncagent/",
                    "tomcat/logs/presence-engine/",
                ],
            },
            "uc": {
                "base": "/var/log/active/",
                "paths": [
                    "unity/messaging/",
                    "unity/voicemail/",
                    "cuc/trace/",
                    "tomcat/logs/cuadmin/",
                ],
            },
            "uccx": {
                "base": "/var/log/active/",
                "paths": [
                    "uccx/log/",
                    "uccx/trace/",
                    "tomcat/logs/uccx/",
                ],
            },
            "ucce": {
                "base": "/var/log/",
                "paths": [
                    "icm/",
                    "cvp/",
                ],
            },
            "ea": {
                "base": "/var/log/active/",
                "paths": [
                    "cer/log/",
                    "cer/trace/",
                    "tomcat/logs/cer/",
                ],
            },
        }

        for product, info in path_expectations.items():
            if product in self.products or product in self.view_configs:
                full_name = self.get_product_name(product)
                print(f"### {full_name} ({product.upper()})")
                print(f"   Base: {info['base']}")
                print(f"   Expected paths:")
                for path in info["paths"]:
                    print(f"      • {info['base']}{path}")
                print()

    def get_product_name(self, code):
        """Get full product name from code"""
        names = {
            "ucm": "CUCM",
            "cup": "Cisco Unified Presence",
            "uc": "Unity Connection",
            "uccx": "UCCX",
            "ucce": "UCCE",
            "ea": "Emergency Responder",
            "icm": "ICM",
            "cvp": "CVP",
        }
        return names.get(code, code.upper())

    def generate_json(self):
        """Generate JSON output"""
        output = {
            "source": "RTMT Multi-Product Analysis",
            "rtmt_path": str(self.rtmt_path),
            "view_configs": sorted(self.view_configs),
            "property_files": sorted(self.property_files),
            "products": {},
        }

        for product, evidence in self.products.items():
            output["products"][product] = {
                "full_name": self.get_product_name(product),
                "view_style_present": bool(evidence["view_style"]),
                "property_files": sorted(evidence["properties"]),
                "class_count": len(evidence["all_classes"]),
                "plugin_count": len(self.plugins.get(product, [])),
                "sample_classes": sorted(evidence["classes"])[:10],
            }

        output_file = self.rtmt_path / "rtmt_multi_product_analysis.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Saved JSON to: {output_file}")

    def generate_markdown(self):
        """Generate markdown report"""
        output = []
        output.append("# 🔍 RTMT Multi-Product Support Analysis\n\n")
        output.append(f"**Source**: {self.rtmt_path}\n\n")
        output.append("---\n\n")

        output.append("## 📊 Products Detected\n\n")

        for product in sorted(self.products.keys()):
            full_name = self.get_product_name(product)
            evidence = self.products[product]

            output.append(f"### {full_name} ({product.upper()})\n\n")

            if evidence["view_style"]:
                output.append("- ✅ **ViewConfig Style**: Present\n")

            if evidence["properties"]:
                output.append(
                    f"- ✅ **Property Files**: {', '.join(evidence['properties'])}\n"
                )

            if evidence["classes"]:
                output.append(
                    f"- ✅ **Code Classes**: {len(evidence['all_classes'])} found\n"
                )

            if product in self.plugins and self.plugins[product]:
                output.append(
                    f"- ✅ **Plugin Support**: {len(self.plugins[product])} plugins\n"
                )

            output.append("\n")

        output.append("## 🎯 Summary\n\n")
        output.append(f"- **Total Products**: {len(self.products)}\n")
        output.append(f"- **ViewConfig Styles**: {len(self.view_configs)}\n")
        output.append(f"- **Property Files**: {len(self.property_files)}\n")

        md_file = self.rtmt_path / "RTMT_MULTI_PRODUCT_ANALYSIS.md"
        with open(md_file, "w", encoding="utf-8") as f:
            f.writelines(output)

        print(f"📝 Saved markdown to: {md_file}")


def main():
    import sys

    if len(sys.argv) < 2:
        rtmt_path = r"C:\Users\mitchong\Downloads\RTMT_Unity_Extract"
    else:
        rtmt_path = sys.argv[1]

    if not os.path.exists(rtmt_path):
        print(f"❌ RTMT path not found: {rtmt_path}")
        sys.exit(1)

    analyzer = RTMTProductAnalyzer(rtmt_path)
    analyzer.analyze()

    print("\n✅ Analysis complete!")
    print("\n📄 Generated files:")
    print("   • rtmt_multi_product_analysis.json")
    print("   • RTMT_MULTI_PRODUCT_ANALYSIS.md")


if __name__ == "__main__":
    main()
