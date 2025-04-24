# LightRead Chrome Extension

LightRead is a Chrome extension that uses AI to instantly summarize any selected text on the web. Whether you're skimming news articles, doing research, or just curious about a long blog post, LightRead helps you get to the point — fast.

## Current Features

- **Text Summarization**: Select any text on a webpage and get a concise summary using AI.
- **Context Menu Integration**: Right-click to access the summarization feature directly from the context menu.
- **Popup Display**: If the webpage's Content Security Policy (CSP) prevents script injection, the summary is displayed in the extension's popup.
- **Copy to Clipboard**: Easily copy the generated summary to your clipboard.
- **Tunable Parameters**: Options for tone, length, difficulty, and more. 
- **User Preferences**: Allow users to customize summarization settings and preferences.
- **Summary History**: Allows users to save their summaries to a personal dashbaord for later viewing. 

## Upcoming Features

- **Enhanced Summarization Models**: Integration with more advanced AI models for improved summaries.
- **PDF Support**: Easily summarize parts of PDFs, as well as web pages. 
- **TTS Playback**: Listen to your summary using text-to-speech capabilities. 
- **Follow Up Questions**: Ask a follow up question based on the summarized info. 

# Project Structure

The project is organized into two main parts:

- **backend/**: Contains the server-side code and configuration.
- **extension/**: Contains the Chrome extension files.

## Backend

The backend is a Flask server that handles requests from the Chrome extension.

### Running the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Build the Docker image:
   ```bash
   docker build -t myapp-backend .
   ```

3. Run the Docker container:
   ```bash
   docker run -p 3000:3000 myapp-backend
   ```

## Extension

The extension is a Chrome extension that interacts with the backend server.

### Installing the Extension

1. Navigate to the `extension` directory.
2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the `extension` directory.

## Environment Variables

Ensure that the `.env` file in the `backend` directory is configured with the necessary environment variables.

---

🔒 This project is proprietary. See the [LICENSE](./LICENSE) for details.
