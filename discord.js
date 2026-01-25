/**
 * discord.js - Post to Discord via Webhooks for multiple channels
 *
 * Posts gematria phrase with animated GIF pattern
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
const FormData = require('form-data');

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
 * Post gematria result to Discord with GIF attachment
 * @param {string} channel - Channel name
 * @param {object} data - Gematria data { phrase, values, hebrewValue, englishValue, simpleValue, aikBekarValue, words, gifPath }
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
        // Build embeds
        const embeds = [];

        // Add gematria values embed if we have individual values
        if (data.hebrewValue || data.englishValue || data.simpleValue || data.aikBekarValue) {
            embeds.push({
                title: 'Gematria Values',
                color: 0xDC2626, // Red color
                fields: [
                    { name: 'Hebrew', value: data.hebrewValue || '-', inline: true },
                    { name: 'English', value: data.englishValue || '-', inline: true },
                    { name: 'Simple', value: data.simpleValue || '-', inline: true },
                    { name: 'Aik Bekar⁹', value: data.aikBekarValue || '-', inline: true }
                ]
            });
        }

        // Build embeds for each word definition
        for (const wordData of data.words || []) {
            embeds.push({
                title: wordData.word,
                description: `*${wordData.partOfSpeech}*\n${wordData.definition}`
            });
        }

        // Build content with bold phrase
        const content = `**${data.phrase}**\n${data.values}`;

        // If we have a GIF, upload it with multipart form data
        if (data.gifPath && fs.existsSync(data.gifPath)) {
            // Add embed for the GIF image
            embeds.push({
                image: { url: 'attachment://pattern.gif' }
            });

            const payload = {
                content: content,
                username: config.botName,
                embeds: embeds.slice(0, 10)
            };

            // Use FormData to upload the GIF
            const form = new FormData();
            form.append('payload_json', JSON.stringify(payload));
            form.append('files[0]', fs.createReadStream(data.gifPath), {
                filename: 'pattern.gif',
                contentType: 'image/gif'
            });

            const response = await fetch(config.webhook, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Webhook failed: ${err}`);
            }
        } else {
            // No GIF, just send JSON
            const payload = {
                content: content,
                username: config.botName,
                embeds: embeds.slice(0, 10)
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
        hebrewValue: '555',
        englishValue: '666',
        simpleValue: '111',
        aikBekarValue: '99',
        words: [
            {
                word: 'Yoga',
                partOfSpeech: 'noun',
                definition: 'Any of several Hindu or Buddhist disciplines aimed at training the consciousness for a state of perfect spiritual insight and tranquillity.'
            },
            {
                word: 'Highland',
                partOfSpeech: 'noun',
                definition: 'An area of land that is at elevation; mountainous land.'
            }
        ],
        gifPath: fs.existsSync('./output.gif') ? './output.gif' : null
    };

    postGematria(testChannel, testData).then(console.log);
}

module.exports = { postToDiscord, postGematria, getConfiguredChannels, CHANNELS };
