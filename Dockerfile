# Use Playwright's official base image
FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Install FFmpeg and Xvfb (virtual display)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create directories for frames
RUN mkdir -p frames videos

# Expose port for health checks
EXPOSE 8080

# Run with Xvfb virtual display
CMD xvfb-run --auto-servernum --server-args="-screen 0 1280x720x24" node reply-bot.js
