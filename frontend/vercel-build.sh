#!/bin/bash

# Print environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Print directory contents before build
echo "Directory contents before build:"
ls -la

# Run the build
npm run build

# Ensure dist directory exists and has content
if [ -d "dist" ]; then
  echo "Dist directory exists. Contents:"
  ls -la dist
else
  echo "ERROR: Dist directory does not exist after build!"
  exit 1
fi 