/**
 * Gematria Discord Bot
 *
 * Responds to !gem, !gematria commands and @mentions
 * Generates gematria phrases with animated GIFs and word definitions
 */

require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { generateGematria } = require('./gematria-generator');
const { getDefinitions } = require('./dictionary');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Health check server for Fly.io
const PORT = process.env.PORT || 8080;
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});
healthServer.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WEBHOOK_URLS = process.env.DISCORD_WEBHOOK_URLS ? process.env.DISCORD_WEBHOOK_URLS.split(',') : [];

// Track if we're currently generating to prevent spam
let isGenerating = false;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Bot is in ${client.guilds.cache.size} server(s)`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();
    const isMentioned = message.mentions.has(client.user);
    const isCommand = content.startsWith('!gem') || content.startsWith('!gematria');

    if (!isMentioned && !isCommand) return;

    if (isGenerating) {
        await message.reply('Already generating a gematria phrase. Please wait...');
        return;
    }

    isGenerating = true;

    try {
        await message.channel.sendTyping();
        console.log(`Generating gematria for ${message.author.tag}...`);

        // Generate the gematria phrase and GIF
        const result = await generateGematria();

        if (!result.success) {
            await message.reply(`Failed to generate gematria: ${result.error}`);
            return;
        }

        const { phrase, values, gifPath } = result;

        // Get definitions for each word
        const words = phrase.split(/\s+/).filter(w => w.length > 1);
        const definitions = await getDefinitions(words);

        // Format the message
        const formattedMessage = formatMessage(phrase, values, definitions);

        // Send the message with the GIF
        const files = [];
        if (gifPath && fs.existsSync(gifPath)) {
            files.push(new AttachmentBuilder(gifPath, { name: 'gematria.gif' }));
        }

        await message.channel.send({
            content: formattedMessage,
            files
        });

        // Also post to webhooks if configured
        if (WEBHOOK_URLS.length > 0) {
            await postToWebhooks(formattedMessage, gifPath);
        }

        console.log(`Successfully generated: "${phrase}" (${values})`);

    } catch (error) {
        console.error('Error generating gematria:', error);
        await message.reply('An error occurred while generating the gematria phrase.');
    } finally {
        isGenerating = false;
    }
});

function formatMessage(phrase, values, definitions) {
    // Bold top line with phrase and values
    let msg = `**${phrase} (${values})**\n`;

    // Add definitions for each word
    for (const def of definitions) {
        if (def.found) {
            msg += `\n**${capitalizeFirst(def.word)}**\n`;
            msg += `*${def.partOfSpeech}*\n`;
            msg += `${def.definition}\n`;
        }
    }

    return msg;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function postToWebhooks(content, gifPath) {
    const FormData = (await import('form-data')).default;

    for (const webhookUrl of WEBHOOK_URLS) {
        if (!webhookUrl.trim()) continue;

        try {
            const formData = new FormData();

            const payload = {
                content: content,
                username: 'nonstop aik bekar\u2079 bot'
            };

            formData.append('payload_json', JSON.stringify(payload));

            if (gifPath && fs.existsSync(gifPath)) {
                formData.append('file', fs.createReadStream(gifPath), 'gematria.gif');
            }

            const response = await fetch(webhookUrl.trim(), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error(`Webhook failed: ${response.status}`);
            }
        } catch (err) {
            console.error('Webhook error:', err.message);
        }
    }
}

// Start the bot
if (!BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN is required. Set it in your .env file.');
    process.exit(1);
}

client.login(BOT_TOKEN);
