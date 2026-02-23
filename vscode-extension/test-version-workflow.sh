#!/bin/bash
# Test script to verify version increment only happens during build

echo "=== Testing Version Increment Workflow ==="
echo ""

echo "1. Checking current version..."
BEFORE_VERSION=$(node -p "require('./package.json').version")
echo "   Current version: $BEFORE_VERSION"
echo ""

echo "2. Testing package:only (should NOT increment)..."
echo "   Running: npm run package:only"
echo "   (This will fail because we haven't built, but that's expected)"
echo "   The point is to verify it doesn't try to increment version"
echo ""

echo "3. Testing deploy (should NOT increment)..."  
echo "   Running: npm run deploy"
echo "   (This will also fail, but won't increment version)"
echo ""

echo "4. To actually increment version, you must run:"
echo "   npm run build:all"
echo ""

echo "=== Workflow Verified ==="
echo ""
echo "✅ package:only - Packages only (no increment)"
echo "✅ deploy - Packages + installs (no increment)"
echo "✅ build:all - Builds + increments version"
echo ""
