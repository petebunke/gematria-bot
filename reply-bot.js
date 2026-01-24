/**
 * Gematria Reply Bot for Discord
 * Responds to @mentions and !gem/!gematria commands
 */

require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Health check server for Fly.io
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
}).listen(PORT);

// Dictionary API
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

let isGenerating = false;

client.once('ready', () => {
    console.log('═══════════════════════════════════════════');
    console.log('    🔢 Reply Bot Online');
    console.log('═══════════════════════════════════════════');
    console.log(`   Logged in as: ${client.user.tag}`);
    console.log(`   Bot ID: ${client.user.id}`);
    console.log('   Listening for:');
    console.log('   - @mentions');
    console.log('   - !gematria or !gem commands');
    console.log('═══════════════════════════════════════════');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();
    const isMentioned = message.mentions.has(client.user);
    const isCommand = content.startsWith('!gem') || content.startsWith('!gematria');

    if (!isMentioned && !isCommand) return;

    if (isGenerating) {
        await message.reply('⏳ Already generating. Please wait...');
        return;
    }

    isGenerating = true;
    const channelName = message.channel.name || 'DM';

    try {
        console.log(`📩 Triggered by ${message.author.username} in #${channelName}`);
        console.log('   Fetching gematria phrase...');

        await message.channel.sendTyping();

        // Generate gematria with timeout
        const result = await Promise.race([
            generateGematria(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Generation timed out after 90s')), 90000))
        ]);

        if (!result.success) {
            console.log(`❌ Generation failed: ${result.error}`);
            await message.reply(`❌ Failed: ${result.error}`);
            return;
        }

        console.log(`✅ Generated: "${result.phrase}" (${result.values})`);

        // Get word definitions
        const definitions = await getDefinitions(result.phrase.split(/\s+/));

        // Format message
        let msg = `**${result.phrase} (${result.values})**\n`;
        for (const def of definitions) {
            if (def.found) {
                msg += `\n**${capitalize(def.word)}**\n*${def.partOfSpeech}*\n${def.definition}\n`;
            }
        }

        // Send with GIF if available
        const files = [];
        if (result.gifPath && fs.existsSync(result.gifPath)) {
            files.push(new AttachmentBuilder(result.gifPath, { name: 'gematria.gif' }));
        }

        await message.channel.send({ content: msg, files });
        console.log('📤 Message sent successfully');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await message.reply(`❌ Error: ${error.message}`).catch(() => {});
    } finally {
        isGenerating = false;
    }
});

async function generateGematria() {
    let browser = null;
    const FRAMES_DIR = path.join(__dirname, 'frames');
    const OUTPUT_GIF = path.join(__dirname, 'output.gif');

    try {
        console.log('🚀 Starting scraper...');
        console.log('   Chromium path:', chromium.executablePath());

        // Launch with timeout wrapper to prevent infinite hang
        const launchPromise = chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        browser = await Promise.race([
            launchPromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Browser launch timed out after 30s')), 30000)
            )
        ]);

        console.log('   Browser launched');

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);

        console.log('   Navigating to gematriagenerator.app...');
        await page.goto('https://gematriagenerator.app', {
            waitUntil: 'networkidle',
            timeout: 45000
        });

        // Wait for page to be ready
        console.log('   Waiting for page load...');
        try {
            await page.waitForSelector('button:has-text("Loading")', { state: 'hidden', timeout: 30000 });
        } catch (e) {
            console.log('   (No loading button found, continuing)');
        }

        // Enable Aik Bekar
        try {
            await page.locator('input[type="checkbox"]').first().check({ timeout: 5000 });
            console.log('   Aik Bekar enabled');
        } catch (e) {
            console.log('   (Checkbox not found, continuing)');
        }

        let phrase = '';
        let values = '';

        // Try to generate phrase
        for (let attempt = 1; attempt <= 10 && !phrase; attempt++) {
            console.log(`   Attempt ${attempt}/10...`);

            // Close any error modals
            try {
                const closeBtn = page.locator('button:has-text("Close")').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) {}

            // Clear previous
            try {
                const clearBtn = page.locator('button:has-text("Clear")');
                if (await clearBtn.isVisible({ timeout: 500 })) {
                    await clearBtn.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) {}

            // Click generate
            try {
                await page.click('button:has-text("Generate Random Phrase")', { timeout: 5000 });
            } catch (e) {
                console.log('   Generate button not found');
                continue;
            }

            // Wait for generation (max 30s)
            for (let i = 0; i < 30; i++) {
                await page.waitForTimeout(1000);
                const stillGenerating = await page.locator('button:has-text("Generating")').isVisible().catch(() => false);
                if (!stillGenerating) break;
            }

            await page.waitForTimeout(2000);

            // Extract phrase
            const inputs = await page.locator('input[type="text"]').all();
            for (const input of inputs) {
                const val = await input.inputValue().catch(() => '');
                if (val.length > 5) {
                    phrase = val;
                    break;
                }
            }

            // Extract values
            if (phrase) {
                values = await page.evaluate(() => {
                    const els = document.querySelectorAll('*');
                    for (const el of els) {
                        const text = el.textContent?.trim() || '';
                        if (/^\d+\/\d+\/\d+\/\d+$/.test(text)) return text;
                    }
                    return '';
                }) || '';
            }
        }

        if (!phrase) {
            await browser.close();
            return { success: false, error: 'Could not generate phrase' };
        }

        console.log(`   Phrase: ${phrase}`);
        console.log(`   Values: ${values}`);

        // Capture GIF frames
        if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
        fs.mkdirSync(FRAMES_DIR, { recursive: true });

        const svgs = await page.locator('svg').all();
        let targetSvg = null;
        for (const svg of svgs) {
            const box = await svg.boundingBox().catch(() => null);
            if (box && box.width > 200 && box.height > 100) {
                targetSvg = svg;
                break;
            }
        }

        if (targetSvg) {
            console.log('   Capturing 30 frames...');
            await targetSvg.scrollIntoViewIfNeeded();
            for (let i = 0; i < 30; i++) {
                await targetSvg.screenshot({
                    path: path.join(FRAMES_DIR, `frame${String(i).padStart(3, '0')}.png`)
                });
                await page.waitForTimeout(100);
            }

            console.log('   Converting to GIF...');
            try {
                execSync(
                    `ffmpeg -y -i ${FRAMES_DIR}/frame%03d.png -vf "pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg" ${OUTPUT_GIF}`,
                    { stdio: 'pipe', timeout: 30000 }
                );
                console.log('   GIF created');
            } catch (e) {
                console.log('   GIF creation failed:', e.message);
            }
        }

        await browser.close();
        browser = null;

        return {
            success: true,
            phrase,
            values,
            gifPath: fs.existsSync(OUTPUT_GIF) ? OUTPUT_GIF : null
        };

    } catch (error) {
        console.error('   Scraper error:', error.message);
        if (browser) await browser.close().catch(() => {});
        return { success: false, error: error.message };
    }
}

async function getDefinitions(words) {
    const results = [];
    const skip = ['a', 'an', 'the', 'is', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'or', 'and', 'but', 'be', 'am', 'are', 'was', 'were', 'it', 'as', 'if', 'so', 'up', 'he', 'she', 'we', 'they', 'you', 'i', 'my', 'me', 'his', 'her', 'our', 'your', 'this', 'that', 'ar', 'ac'];

    for (const word of words) {
        if (word.length < 2 || skip.includes(word.toLowerCase())) continue;

        try {
            const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word.toLowerCase())}`, { timeout: 5000 });
            if (!res.ok) continue;

            const data = await res.json();
            if (Array.isArray(data) && data[0]?.meanings?.[0]) {
                const m = data[0].meanings[0];
                results.push({
                    word,
                    found: true,
                    partOfSpeech: m.partOfSpeech || 'unknown',
                    definition: m.definitions?.[0]?.definition || ''
                });
            }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 100));
    }

    return results;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Start bot
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not set');
    process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN);
