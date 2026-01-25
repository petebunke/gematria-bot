#!/bin/bash
set -e

echo "Installing npm dependencies..."
npm install

echo "Installing Playwright browsers..."
npx playwright install chromium
npx playwright install-deps chromium

echo "Build complete!"
