#!/usr/bin/env node

/**
 * Increment Version Script
 * Automatically increments the patch version (third octet) in package.json
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'package.json');

try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Parse current version
    const versionParts = packageJson.version.split('.');
    if (versionParts.length !== 3) {
        console.error('❌ Invalid version format. Expected x.y.z');
        process.exit(1);
    }

    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    const patch = parseInt(versionParts[2]);

    // Increment patch version (third octet)
    const newPatch = patch + 1;
    const newVersion = `${major}.${minor}.${newPatch}`;

    // Update version in package.json
    packageJson.version = newVersion;

    // Write back to package.json with proper formatting
    fs.writeFileSync(
        packagePath,
        JSON.stringify(packageJson, null, 4) + '\n',
        'utf8'
    );

    console.log('✅ Version incremented successfully!');
    console.log(`   Old version: ${major}.${minor}.${patch}`);
    console.log(`   New version: ${newVersion}`);
    console.log('');

} catch (error) {
    console.error('❌ Error incrementing version:', error.message);
    process.exit(1);
}
