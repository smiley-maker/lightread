const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../extension/.env') });

const env = process.argv[2] || 'development';
const config = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000'
};

const configContent = `// Auto-generated config file
const config = ${JSON.stringify(config, null, 2)};

export default config;
`;

fs.writeFileSync(
  path.join(__dirname, '../extension/config.js'),
  configContent
);

console.log(`Generated config.js for ${env} environment`); 