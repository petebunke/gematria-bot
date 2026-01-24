/**
 * discord.js - Post to Discord via Webhooks for multiple channels
 *
 * Each channel has its own webhook and bot name:
 * - reply: "reply aik bekar⁹ bot"
 * - daily: "daily aik bekar⁹ bot"
 * - weekly: "weekly aik bekar⁹ bot"
 * - monthly: "monthly aik bekar⁹ bot"
 * - seasonal: "seasonal aik bekar⁹ bot"
 * - yearly: "yearly aik bekar⁹ bot"
 * - decadic: "decadic aik bekar⁹ bot"
 */

require('dotenv').config();

// Channel configurations
const CHANNELS = {
    reply: {
        webhook: process.env.DISCORD_WEBHOOK_REPLY,
        botName: 'reply aik bekar⁹ bot'
    },
    daily: {
        webhook: process.env.DISCORD_WEBHOOK_DAILY,
        botName: 'daily aik bekar⁹ bot'
    },
    weekly: {
        webhook: process.env.DISCORD_WEBHOOK_WEEKLY,
        botName: 'weekly aik bekar⁹ bot'
    },
    monthly: {
        webhook: process.env.DISCORD_WEBHOOK_MONTHLY,
        botName: 'monthly aik bekar⁹ bot'
    },
    seasonal: {
        webhook: process.env.DISCORD_WEBHOOK_SEASONAL,
        botName: 'seasonal aik bekar⁹ bot'
    },
    yearly: {
        webhook: process.env.DISCORD_WEBHOOK_YEARLY,
        botName: 'yearly aik bekar⁹ bot'
    },
    decadic: {
        webhook: process.env.DISCORD_WEBHOOK_DECADIC,
        botName: 'decadic aik bekar⁹ bot'
    }
};

/**
 * Post to a specific Discord channel
 * @param {string} channel - Channel name (reply, daily, weekly, monthly, seasonal, yearly, decadic)
 * @param {string} text - Message text
 * @param {object} options - Optional embed settings
 */
async function postToDiscord(channel, text, options = {}) {
    const config = CHANNELS[channel];

    if (!config) {
        console.log(`⚠️  Unknown channel: ${channel}`);
        return { success: false, error: `Unknown channel: ${channel}` };
    }

    if (!config.webhook) {
        console.log(`⚠️  Discord webhook not configured for ${channel}. Skipping.`);
        return { success: false, error: `Missing webhook URL for ${channel}` };
    }

    try {
        const payload = {
            content: text,
            username: config.botName
        };

        // Optional: Create an embed for nicer formatting
        if (options.embed) {
            payload.embeds = [{
                title: options.embed.title || 'Gematria',
                description: options.embed.description || text,
                color: options.embed.color || 0x9B59B6, // Purple
                timestamp: new Date().toISOString(),
                footer: {
                    text: `Posted by ${config.botName}`
                }
            }];
            payload.content = undefined; // Use embed instead
        }

        const response = await fetch(config.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Webhook failed: ${err}`);
        }

        console.log(`✅ Discord [${channel}]: Posted successfully as "${config.botName}"!`);
        return { success: true, channel, botName: config.botName };

    } catch (error) {
        console.error(`❌ Discord [${channel}] error:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Post to all configured channels
 */
async function postToAllChannels(text, options = {}) {
    const results = {};

    for (const channel of Object.keys(CHANNELS)) {
        if (CHANNELS[channel].webhook) {
            results[channel] = await postToDiscord(channel, text, options);
        }
    }

    return results;
}

/**
 * Get list of configured channels
 */
function getConfiguredChannels() {
    return Object.entries(CHANNELS)
        .filter(([_, config]) => config.webhook)
        .map(([name, config]) => ({ name, botName: config.botName }));
}

// Test if run directly
if (require.main === module) {
    console.log('Configured channels:', getConfiguredChannels());

    const testChannel = process.argv[2] || 'daily';
    const testMessage = `🔢 Test post - ${new Date().toLocaleString()}`;

    postToDiscord(testChannel, testMessage, {
        embed: {
            title: '🔢 Gematria Test',
            description: testMessage,
            color: 0x9B59B6
        }
    }).then(console.log);
}

module.exports = { postToDiscord, postToAllChannels, getConfiguredChannels, CHANNELS };
