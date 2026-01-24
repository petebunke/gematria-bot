/**
 * reply-bot.js - Discord bot that responds to mentions and commands
 *
 * Responds to:
 * - @bot mentions
 * - !gematria command
 * - !gem command (shortcut)
 */

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { getGematriaPhrase } = require('./scraper');

const PATTERN_IMAGE_URL = 'https://raw.githubusercontent.com/petebunke/gematria-bot/main/pattern.png';

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

        // Get gematria phrase
        console.log('   Fetching gematria phrase...');
        let data;
        try {
            data = await getGematriaPhrase();
        } catch (err) {
            console.log('   ⚠️ Scraper error, using test data');
            data = {
                phrase: 'test phrase',
                values: '111/222/33/44',
                words: [
                    { word: 'Test', partOfSpeech: 'noun', definition: 'A procedure for testing.' },
                    { word: 'Phrase', partOfSpeech: 'noun', definition: 'A group of words.' }
                ]
            };
        }

        // Build embeds for each word
        const embeds = [];
        for (const wordData of data.words || []) {
            const embed = new EmbedBuilder()
                .setTitle(wordData.word)
                .setDescription(`*${wordData.partOfSpeech}*\n${wordData.definition}`)
                .setImage(PATTERN_IMAGE_URL);
            embeds.push(embed);
        }

        // Send the response
        await message.reply({
            content: `${data.phrase} (${data.values})`,
            embeds: embeds.slice(0, 10) // Discord limits to 10 embeds
        });

        console.log('   ✅ Replied successfully!\n');

    } catch (error) {
        console.error('   ❌ Error:', error.message);
        await message.reply('Sorry, something went wrong fetching the gematria phrase.');
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
