/**
 * reply-bot.js - Discord bot that responds to mentions and commands
 *
 * Responds to:
 * - @bot mentions
 * - !gematria command
 * - !gem command (shortcut)
 *
 * Posts gematria phrase with animated GIF pattern
 */

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getGematriaPhrase } = require('./scraper');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log('═══════════════════════════════════════════');
    console.log('    🔢 Reply Bot Online');
    console.log('═══════════════════════════════════════════');
    console.log(`   Logged in as: ${client.user.tag}`);
    console.log(`   Bot ID: ${client.user.id}`);
    console.log('');
    console.log('   Listening for:');
    console.log('   - @mentions');
    console.log('   - !gematria or !gem commands');
    console.log('═══════════════════════════════════════════\n');
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if bot was mentioned or command was used
    const isMentioned = message.mentions.has(client.user);
    const isCommand = message.content.startsWith('!gematria') || message.content.startsWith('!gem');

    if (!isMentioned && !isCommand) return;

    console.log(`📩 Triggered by ${message.author.tag} in #${message.channel.name}`);

    try {
        // Show typing indicator
        await message.channel.sendTyping();

        // Get gematria phrase with GIF
        console.log('   Fetching gematria phrase...');
        let data;
        try {
            data = await getGematriaPhrase({ headless: true, createGif: true });
        } catch (err) {
            console.log('   ⚠️ Scraper error:', err.message);
            console.log('   Full error:', err.stack);
            // Fallback to simple message
            await message.reply(`Sorry, I had trouble generating a phrase: ${err.message}`);
            return;
        }

        console.log('   Got:', data.phrase);

        // Build the message content with bold phrase
        const messageContent = `**${data.phrase}**\n${data.values}`;

        // Build embeds for each word definition
        const embeds = [];

        // Add gematria values embed
        const valuesEmbed = new EmbedBuilder()
            .setTitle('Gematria Values')
            .setColor(0xDC2626);

        if (data.hebrewValue || data.englishValue || data.simpleValue || data.aikBekarValue) {
            valuesEmbed.addFields(
                { name: 'Hebrew', value: data.hebrewValue || '-', inline: true },
                { name: 'English', value: data.englishValue || '-', inline: true },
                { name: 'Simple', value: data.simpleValue || '-', inline: true },
                { name: 'Aik Bekar⁹', value: data.aikBekarValue || '-', inline: true }
            );
            embeds.push(valuesEmbed);
        }

        // Add word definitions
        for (const wordData of data.words || []) {
            const embed = new EmbedBuilder()
                .setTitle(wordData.word)
                .setDescription(`*${wordData.partOfSpeech}*\n${wordData.definition}`);
            embeds.push(embed);
        }

        // Prepare reply options
        const replyOptions = {
            content: messageContent,
            embeds: embeds.slice(0, 9) // Leave room for GIF embed
        };

        // Add GIF if available
        if (data.gifPath && fs.existsSync(data.gifPath)) {
            const attachment = new AttachmentBuilder(data.gifPath, { name: 'pattern.gif' });
            replyOptions.files = [attachment];

            // Add final embed with the GIF
            const gifEmbed = new EmbedBuilder()
                .setImage('attachment://pattern.gif');
            replyOptions.embeds.push(gifEmbed);
        }

        // Send the response
        await message.reply(replyOptions);

        console.log('   ✅ Replied successfully!\n');

    } catch (error) {
        console.error('   ❌ Error:', error.message);
        try {
            await message.reply('Sorry, something went wrong. Please try again!');
        } catch (e) {}
    }
});

// Handle errors
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Login
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN not found in .env file');
    process.exit(1);
}

client.login(token).catch((error) => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
