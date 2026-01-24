FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

# Ensure Chromium is installed
RUN npx playwright install chromium

COPY . .

CMD ["node", "reply-bot.js"]
