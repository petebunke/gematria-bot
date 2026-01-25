FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Use xvfb-run for headed browser mode (needed for proper SVG rendering)
CMD ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1920x1080x24", "node", "reply-bot.js"]

