// Simple build script for the extension
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Define environments and their configurations
const environments = {
  development: {
    // If DEV_SERVER_URL is not set, use PROD_SERVER_URL or SERVER_URL as fallback
    SERVER_URL: process.env.DEV_SERVER_URL || process.env.PROD_SERVER_URL || process.env.SERVER_URL || 'http://localhost:3000'
  },
  production: {
    SERVER_URL: process.env.PROD_SERVER_URL || process.env.SERVER_URL
  }
};

// Get environment from command line arguments or default to development
const env = process.argv[2] || 'development';
console.log(`Building for ${env} environment...`);

if (!environments[env]) {
  console.error(`Unknown environment: ${env}`);
  process.exit(1);
}

// Check if we're using fallback URLs and warn
if (env === 'production' && !process.env.PROD_SERVER_URL && !process.env.SERVER_URL) {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: No PROD_SERVER_URL or SERVER_URL found in environment variables!');
  console.warn('\x1b[33m%s\x1b[0m', 'You must provide a production server URL in your .env file or CI/CD pipeline.');
  console.warn('\x1b[33m%s\x1b[0m', 'Exiting build process to prevent accidental use of development URLs in production.');
  process.exit(1);
}

if (env === 'development') {
  if (!process.env.DEV_SERVER_URL && (process.env.PROD_SERVER_URL || process.env.SERVER_URL)) {
    console.log('\x1b[32m%s\x1b[0m', 'INFO: Using production server for development build.');
  } else if (!process.env.DEV_SERVER_URL) {
    console.warn('\x1b[33m%s\x1b[0m', 'INFO: No DEV_SERVER_URL found. Using default localhost URL.');
  }
}

// Read the config template
const configTemplate = fs.readFileSync(
  path.join(__dirname, 'extension', 'config.sample.js'), 
  'utf-8'
);

// Replace placeholders with actual values
let configContent = configTemplate;
Object.entries(environments[env]).forEach(([key, value]) => {
  // Ensure we have a value
  if (!value && key === 'SERVER_URL') {
    console.error(`ERROR: No value found for ${key} in ${env} environment!`);
    process.exit(1);
  }
  configContent = configContent.replace(`__${key}__`, value);
});

// Write the config file
fs.writeFileSync(
  path.join(__dirname, 'extension', 'config.js'),
  configContent
);

console.log('Config file generated successfully.');
console.log('Server URL:', environments[env].SERVER_URL);

// Update the manifest.json file with environment-specific host permissions
const manifestPath = path.join(__dirname, 'extension', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Set host permissions based on environment
const serverUrl = environments[env].SERVER_URL;
const serverUrlPattern = new URL(serverUrl).origin + '/*';

// Update host_permissions to include the appropriate server URL
manifest.host_permissions = [serverUrlPattern];

// No need to add localhost separately if it's already the server URL
if (env === 'development' && !serverUrlPattern.includes('localhost') && process.env.DEV_SERVER_URL === 'http://localhost:3000') {
  manifest.host_permissions.push('http://localhost:3000/*');
}

// Note: privacy_policy_url should be set in the Chrome Web Store listing, not in the manifest

// Write the updated manifest back to the file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Manifest file updated successfully with host permissions:', manifest.host_permissions);

// Add a reminder about not committing config.js
console.log('\nIMPORTANT: The generated config.js file should not be committed to version control.');
console.log('Make sure it is listed in your .gitignore file.'); 