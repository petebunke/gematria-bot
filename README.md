# 🔢 Gematria Phrase Poster

Generate gematria phrases from [gematriagenerator.app](https://gematriagenerator.app) and automatically post them to social media.

## Supported Platforms

| Platform | Cost | Setup Difficulty | Notes |
|----------|------|------------------|-------|
| 🦋 **Bluesky** | Free | ⭐ Easy | Just need app password |
| 🐘 **Mastodon** | Free | ⭐ Easy | Any instance works |
| 💬 **Discord** | Free | ⭐ Easiest | Just a webhook URL |
| ✈️ **Telegram** | Free | ⭐ Easy | Create bot via @BotFather |
| 📘 **Facebook** | Free* | ⭐⭐⭐ Complex | Requires developer app, Pages only |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/petebunke/gematria-phrase-poster.git
cd gematria-phrase-poster
npm install
```

### 2. Configure Platforms

```bash
cp .env.example .env
```

Edit `.env` and fill in credentials for the platforms you want. **You only need to configure the ones you'll use.**

### 3. Test the Scraper

```bash
npm run test-scrape
```

This opens the gematria website, takes a screenshot (`debug-screenshot.png`), and shows you what elements exist. You'll need to customize `src/scraper.js` based on what you find.

### 4. Run It

```bash
npm start
```

---

## Platform Setup Guides

### 🦋 Bluesky (Recommended - Super Easy)

1. Create account at [bsky.app](https://bsky.app)
2. Go to **Settings → App Passwords → Add App Password**
3. Add to `.env`:
   ```
   BLUESKY_HANDLE=yourname.bsky.social
   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

**Test it:**
```bash
npm run post-bluesky
```

---

### 🐘 Mastodon (Any Instance)

1. Log into your Mastodon instance (e.g., mastodon.social)
2. Go to **Preferences → Development → New Application**
3. Name it anything, check **write:statuses**, click Submit
4. Click your app name, copy **"Your access token"**
5. Add to `.env`:
   ```
   MASTODON_INSTANCE=https://mastodon.social
   MASTODON_ACCESS_TOKEN=your_token_here
   ```

**Test it:**
```bash
npm run post-mastodon
```

---

### 💬 Discord (Easiest Setup)

1. Open Discord, go to your server
2. Right-click a channel → **Edit Channel → Integrations → Webhooks**
3. Click **New Webhook**, copy the URL
4. Add to `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
   ```

**Test it:**
```bash
npm run post-discord
```

---

### ✈️ Telegram

1. Open Telegram, message [@BotFather](https://t.me/botfather)
2. Send `/newbot`, follow the prompts
3. Copy the bot token
4. Create a channel and add your bot as admin
5. For the chat ID:
   - For channels: use `@yourchannel` format
   - For groups: add [@getidsbot](https://t.me/getidsbot) to get numeric ID
6. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCdef...
   TELEGRAM_CHAT_ID=@your_channel
   ```

**Test it:**
```bash
npm run post-telegram
```

---

### 📘 Facebook (More Complex)

Facebook requires a developer app and can only post to **Pages** (not personal profiles).

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. **Create App** → Choose "Business" or "None" type
3. Add the **Facebook Login** product
4. Go to **Tools → Graph API Explorer**
5. Select your app from the dropdown
6. Click **Add Permission**, add:
   - `pages_manage_posts`
   - `pages_read_engagement`
7. Click **Generate Access Token** (you'll need to log in)
8. **Get Page Token:**
   - In Graph API Explorer, make this request: `GET /me/accounts`
   - Find your page in the results
   - Copy that page's `access_token`
9. **Get Page ID:** Go to your Facebook Page → About → Page ID
10. Add to `.env`:
    ```
    FACEBOOK_PAGE_ID=123456789
    FACEBOOK_ACCESS_TOKEN=the_page_token
    ```

**⚠️ Note:** Page tokens can expire. For production use, you'll want to exchange for a long-lived token.

---

## Customizing the Scraper

After running `npm run test-scrape`, check:
- `debug-screenshot.png` - visual of the page
- Console output - lists all inputs and buttons

Edit `src/scraper.js` to interact with the actual elements. Example:

```javascript
// Click a generate button
await page.click('button#generate');
await new Promise(r => setTimeout(r, 1000));

// Get values
const phrase = await page.$eval('#phrase-input', el => el.value);
const value = await page.$eval('#result', el => el.textContent);

return { phrase, value };
```

---

## Running on a Schedule

### Option A: Cron (Linux/Mac)

```bash
crontab -e

# Run daily at 9am
0 9 * * * cd /path/to/gematria-phrase-poster && /usr/bin/node index.js >> /var/log/gematria.log 2>&1
```

### Option B: GitHub Actions (Free)

Create `.github/workflows/post.yml`:

```yaml
name: Post Gematria
on:
  schedule:
    - cron: '0 14 * * *'  # 2pm UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: node index.js
        env:
          BLUESKY_HANDLE: ${{ secrets.BLUESKY_HANDLE }}
          BLUESKY_APP_PASSWORD: ${{ secrets.BLUESKY_APP_PASSWORD }}
          # Add other secrets as needed
```

Then add your credentials in **Settings → Secrets → Actions**.

### Option C: Railway/Render/Fly.io

These platforms support scheduled jobs and have free tiers.

---

## Project Structure

```
gematria-phrase-poster/
├── index.js                    # Main entry point
├── src/
│   ├── scraper.js              # Puppeteer scraper for gematriagenerator.app
│   └── platforms/
│       ├── bluesky.js          # Bluesky API
│       ├── mastodon.js         # Mastodon API  
│       ├── discord.js          # Discord webhooks
│       ├── telegram.js         # Telegram Bot API
│       └── facebook.js         # Facebook Graph API
├── .env.example                # Template for credentials
├── .env                        # Your credentials (don't commit!)
└── package.json
```

---

## Troubleshooting

**"Browser was not found"**
```bash
npx puppeteer browsers install chrome
```

**Bluesky: "Invalid credentials"**
- Make sure you're using an **App Password**, not your main password
- Check the handle format (include `.bsky.social`)

**Mastodon: 401 Unauthorized**
- Verify the access token has `write:statuses` permission
- Check the instance URL matches where you created the token

**Facebook: "Invalid access token"**
- Page tokens expire - regenerate in Graph API Explorer
- Make sure you're using the **Page** token, not a User token

**Discord: 404 Not Found**
- Webhook might have been deleted - create a new one

---

## License

MIT
