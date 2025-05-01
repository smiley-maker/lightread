# LightRead Chrome Extension

An AI-powered text summarization extension that helps you quickly digest content from any webpage.

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lightread
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration:
   ```bash
   cp env.example .env
   ```

4. Edit the `.env` file and set your server URLs.

### Building the Extension

#### Development Build

For local development with a local backend:

```bash
npm run build:dev
```

This will generate the `extension/config.js` file with the development server URL and update the manifest.json.

#### Production Build

For production deployment:

```bash
npm run build:prod
```

This requires a `PROD_SERVER_URL` to be set in your `.env` file.

### Packaging for Chrome Web Store

To create a ZIP file for the Chrome Web Store:

```bash
npm run package
```

This will:
1. Run the production build
2. Create a clean distribution folder 
3. Copy the extension files to the distribution folder
4. Remove source files that shouldn't be in the package
5. Generate a ZIP file ready for upload

The final package will be located at `./lightread-extension.zip`.

## Security Considerations

### Environment Variables

- `.env` files are never included in the extension package
- Server URLs are injected at build time into the `config.js` file
- The build process will fail if required environment variables are missing

### Sensitive Files

The following files are not included in the extension package:
- `.env` and any other environment files
- `build.js` and other build scripts
- Source code and development files

### Privacy Policy

You must provide a privacy policy URL when submitting your extension to the Chrome Web Store. Ensure your privacy policy addresses:

- What data is collected
- How data is used
- User control over data
- Data retention policies
- Third-party sharing (if any)

Your privacy policy should be hosted on a stable URL that won't change, as changing the privacy policy URL requires a new submission to the Chrome Web Store.

## Project Structure

```
├── extension/           # Extension source code (uploaded to Chrome Web Store)
│   ├── background.js    # Background script
│   ├── popup.js         # Popup UI script
│   ├── popup.html       # Popup UI HTML
│   ├── config.js        # Generated config (not committed to Git)
│   └── config.sample.js # Config template
├── build.js             # Build script (not uploaded)
├── package.json         # Project configuration (not uploaded)
└── .env                 # Environment variables (not uploaded)
```

## License

[License information]
