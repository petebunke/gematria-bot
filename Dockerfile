# Use Playwright's official base image matching npm package version
FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

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

# Run the bot
CMD ["node", "reply-bot.js"]
