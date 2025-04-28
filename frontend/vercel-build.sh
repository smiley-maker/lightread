#!/bin/bash

# Print current working directory
echo "Current working directory: $(pwd)"

# Print environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Check if we're in the frontend directory
if [[ ! -f "package.json" ]]; then
  echo "ERROR: package.json not found in current directory!"
  echo "Directory contents:"
  ls -la
  
  # Try to find it
  echo "Searching for package.json..."
  find . -name "package.json" -type f | grep -v "node_modules"
  
  # If in the root and frontend exists, cd to it
  if [[ -d "frontend" && -f "frontend/package.json" ]]; then
    echo "Found frontend directory, changing to it..."
    cd frontend
    echo "New working directory: $(pwd)"
  else
    echo "Could not locate the correct directory structure!"
    exit 1
  fi
fi

# Print directory contents before build
echo "Directory contents before build:"
ls -la

# Run the build
echo "Starting build process..."
npm run build

# Ensure dist directory exists and has content
if [[ -d "dist" ]]; then
  echo "Dist directory exists. Contents:"
  ls -la dist
else
  echo "ERROR: Dist directory does not exist after build!"
  exit 1
fi 