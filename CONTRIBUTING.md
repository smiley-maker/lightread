# Contributing to LightRead

### Table of Contents

- [Introduction](#introduction)
- [How To Contribute](#how-to-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Features](#suggesting-features)
    - [Code Contributions](#code-contributions)
    - [Setting Up Your Development Environment](#setting-up-your-development-environment)
    - [Building the Extension](#bulding-the-extension)
    - [Backend Setup](#backend-setup)
    - [Frontend Development](#frontend-development)
    - [Environment Variables](#note-on-environment-variables)
- [Planned Features Roadmap](#planned-features--roadmap)
- [Getting Help](#getting-help)
- [License](#license)


## Introduction

Thank you for your interest in contributing to LightRead! We're excited that you're considering helping us improve this project.

Before you start, please take a moment to read through this document and the project's license.

**Important Note:** LightRead is a proprietary software project. Contributions are welcome for personal, non-commercial use and potential inclusion in the official project, but unauthorized commercial use, distribution, or modification of the code is strictly prohibited. Please see the `LICENSE` file for full details. By contributing to LightRead, you agree to the terms outlined in the `LICENSE`.

## How to Contribute

There are several ways you can contribute to LightRead:

### Reporting Bugs

If you find a bug, please report it by opening an issue on our GitHub [repository](https://github.com/smiley-maker/lightread/issues). 

When reporting a bug, please include as much detail as possible to help us understand and fix it:

* A clear and concise description of the bug.
* Steps to reproduce the behavior.
* Expected behavior.
* Screenshots or videos if helpful.
* Your operating system and browser version.
* The version of the LightRead extension you are using.

### Suggesting Features

Have an idea for a new feature or improvement? We'd love to hear it! Please suggest features by opening an issue on our GitHub [repository](https://github.com/smiley-maker/lightread/issues).

When suggesting a feature, please describe:

* The proposed feature.
* Why you think it would be valuable to LightRead users.
* How you envision the feature working.

### Code Contributions

If you're a developer and would like to contribute code, please follow these steps:

1.  **Fork the Repository:** Fork the LightRead repository on GitHub.
2.  **Clone Your Fork:** Clone your forked repository to your local machine.
3.  **Set up Your Development Environment:** Follow the instructions below to get LightRead running locally.
4.  **Create a New Branch:** Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `bugfix/your-bug-fix-name`).
5.  **Make Your Changes:** Implement your changes, following any existing coding styles.
6.  **Test Your Changes:** Ensure your changes work as expected and don't introduce new issues.
7.  **Commit Your Changes:** Write clear and concise commit messages.
8.  **Push to Your Fork:** Push your changes to your fork on GitHub.
9.  **Submit a Pull Request:** Open a Pull Request from your fork to the main LightRead repository.

Your Pull Request will be reviewed by the project maintainers. We may provide feedback or ask for changes before merging.

### Setting Up Your Development Environment

To set up LightRead for local development (for personal, non-commercial inspection and contribution only, as per the `LICENSE`):

**Project Structure:**

The project is organized into the following main directories:

* `backend/`: Contains the Flask server-side code and configuration.
* `extension/`: Contains the Chrome extension files.
* `frontend/`: Contains the landing page and dashboard files.

**Development Setup & Prerequisites:**

Setup dependencies and extension environment variables:

1. Install dependencies:
    ```bash
    npm install
    ```

2. Create your extension environment configuration based on our template. 
    ```bash
    cp env.example .env
    ```

3. Edit the .env file and set your server URLs. Use localhost:3000 for the backend server if running locally. 

### **Bulding the Extension:**

LightRead is a Chrome extension that interacts with the backend server.

For local development, run the following line in the project root directory. This will generate the `extension/config.js` file with the development server URL and update the `manifest.json`. 
```bash
npm run build:dev
```

<!--**Production Build:**

For production deployment:

```bash
npm run build:prod
```

This requires a `PROD_SERVER_URL` to be set in your `.env` file. 

**Packaging for Chrome Web Store:**

To create a ZIP file for the Chrome Web Store:

```bash
npm run package
```

This will: 

1. Run the production build. 
2. Create a clean distribution folder. 
3. Copy the extension files to the distribution folder. 
4. Remove source files that shouldn't be in the package. 
5. Generate a ZIP file ready for upload. 

The final package will be located at ./`lightread-extension.zip`. 
-->

**To Run the Extension Locally in Chrome**

1.  Navigate to the `extension` directory.
2.  Open Google Chrome and go to `chrome://extensions/`.
3.  Enable "Developer mode" using the toggle in the upper right corner.
4.  Click the "Load unpacked" button.
5.  Select the `extension` directory.


### **Backend Setup:**

The backend is a Flask server that handles requests from the Chrome extension and landing page. 


1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2. Set environment variables in a `.env` file for full functionality. 
2.  Build the Docker image:
    ```bash
    docker build -t lightread-backend .
    ```
3.  Run the Docker container, mapping the necessary port:
    ```bash
    docker run -p 3000:3000 lightread-backend
    ```

### **Frontend Development:**

Our frontend is actively hosted at `lightread.xyz` but we welcome contributions to the design and/or functionality through GitHub as described in previous sections. Follow the steps below for local development. 

1. Set up environment variables, which would for development primarily include the backend url `VITE_API_URL="localhost:3000"`. The other environment variables pertain to Supabase and Stripe setups for the dashboard and subscription plans. 
2. Install dependencies for the frontend. 
    ```bash
    cd frontend
    npm install
    ```
3. Run in development mode. 
    ```bash
    npm run dev
    ```


### **Note On Environment Variables:**

Ensure that `.env` files in the `root`, `frontend`, and `backend` directories are configured with the necessary environment variables for services like Stripe, Supabase, and Gemini. **Do not commit your actual API keys or sensitive information.** Use placeholder values in version control and configure your local `.env` files separately.

## Planned Features / Roadmap

Here are some features we are planning to add to LightRead:

* Tagging and organizing saved summaries in the user dashboard.
* Adding an option for in-popup follow-up questions based on the generated summary.
* Implementing support for summarizing content from PDF files.
* Integrating with other platforms (e.g., Notion) for saving or sharing summaries.
* Adding more advanced AI text-to-speech options (ElevenLabs, Google AI TTS).
* Implementing keyboard shortcuts for faster summarization.
* Exploring the capability to summarize image content.

We encourage contributions towards these planned features or suggestions for new ones!

## Getting Help

If you have questions about contributing or setting up your development environment, please open an [issue](https://github.com/smiley-maker/lightread/issues) on the GitHub repository with your question.

## License

This project is proprietary. Please see the [LICENSE](LICENSE) file for detailed information regarding the terms under which you may use and contribute to LightRead.