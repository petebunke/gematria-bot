/**
 * discord.js - Post to Discord via Webhooks for multiple channels
 *
 * Posts in this format:
 * - phrase words (gematria values)
 * - For each word: Word, part of speech, definition, pattern image
 *
 * Bot names:
 * - reply aik bekar⁹ bot
 * - daily aik bekar⁹ bot
 * - weekly aik bekar⁹ bot
 * - monthly aik bekar⁹ bot
 * - seasonal aik bekar⁹ bot
 * - yearly aik bekar⁹ bot
 * - decadic aik bekar⁹ bot
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

// Pattern image URL (hosted on GitHub)
const PATTERN_IMAGE_URL = 'https://raw.githubusercontent.com/petebunke/gematria-bot/main/pattern.png';

/**
 * Post gematria result to Discord in the exact screenshot format
 * @param {string} channel - Channel name
 * @param {object} data - Gematria data { phrase, values, words: [{ word, partOfSpeech, definition }] }
 */
async function postGematria(channel, data) {
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
        // Format: "yoga highland (555/666/111/99)"
        const mainMessage = `${data.phrase} (${data.values})`;

        // Build embeds for each word
        const embeds = [];
        for (const wordData of data.words || []) {
            embeds.push({
                title: `**${wordData.word}**`,
                description: `*${wordData.partOfSpeech}*\n${wordData.definition}`,
                image: {
                    url: PATTERN_IMAGE_URL
                }
            });
        }

        const payload = {
            content: mainMessage,
            username: config.botName,
            embeds: embeds.length > 0 ? embeds : undefined
        };

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
 * Simple text post (for backwards compatibility)
 */
async function postToDiscord(channel, text, options = {}) {
    const config = CHANNELS[channel];

    if (!config) {
        return { success: false, error: `Unknown channel: ${channel}` };
    }

    if (!config.webhook) {
        return { success: false, error: `Missing webhook URL for ${channel}` };
    }

    try {
        const payload = {
            content: text,
            username: config.botName
        };

        if (options.embed) {
            payload.embeds = [{
                title: options.embed.title,
                description: options.embed.description,
                color: options.embed.color || 0x9B59B6,
                image: options.embed.image ? { url: options.embed.image } : undefined
            }];
            payload.content = undefined;
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

        console.log(`✅ Discord [${channel}]: Posted as "${config.botName}"!`);
        return { success: true, channel, botName: config.botName };

    } catch (error) {
        console.error(`❌ Discord [${channel}] error:`, error.message);
        return { success: false, error: error.message };
    }
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

    // Test with full gematria format
    const testData = {
        phrase: 'yoga highland',
        values: '555/666/111/99',
        words: [
            {
                word: 'Yoga',
                partOfSpeech: 'noun',
                definition: 'Any of several Hindu or Buddhist disciplines aimed at training the consciousness for a state of perfect spiritual insight and tranquillity; especially a system of exercises practiced to promote control of the body and mind.'
            },
            {
                word: 'Highland',
                partOfSpeech: 'noun',
                definition: 'An area of land that is at elevation; mountainous land.'
            }
        ]
    };

    postGematria(testChannel, testData).then(console.log);
}

module.exports = { postToDiscord, postGematria, getConfiguredChannels, CHANNELS, PATTERN_IMAGE_URL };
