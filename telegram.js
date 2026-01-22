/**
 * telegram.js - Post to Telegram via Bot API (FREE)
 * 
 * SETUP:
 * 1. Open Telegram, search for @BotFather
 * 2. Send /newbot and follow the prompts
 * 3. Copy the bot token to your .env file
 * 4. Create a channel or group
 * 5. Add your bot as an admin to the channel/group
 * 6. Get the chat ID:
 *    - For channels: use @username (e.g., @mygematriachannel)
 *    - For groups: add @getidsbot to get the numeric ID
 * 
 * Free, no approval needed.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;  // Can be @channelname or numeric ID

async function postToTelegram(text, options = {}) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('⚠️  Telegram credentials not configured. Skipping.');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: options.parseMode || 'HTML',  // or 'Markdown'
                disable_web_page_preview: options.disablePreview || false
            })
        });

        const result = await response.json();

        if (!result.ok) {
            throw new Error(`Telegram API error: ${result.description}`);
        }

        console.log('✅ Telegram: Posted successfully!');
        console.log('   Message ID:', result.result.message_id);

        return { success: true, messageId: result.result.message_id };

    } catch (error) {
        console.error('❌ Telegram error:', error.message);
        return { success: false, error: error.message };
    }
}

// Test if run directly
if (require.main === module) {
    const testMessage = `🔢 <b>Test post from Gematria Poster</b>\n\n${new Date().toLocaleString()}`;
    postToTelegram(testMessage).then(console.log);
}

module.exports = { postToTelegram };
