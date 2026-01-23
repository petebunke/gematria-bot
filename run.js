/**
 * run.js - Main automation script
 *
 * Scrapes gematriagenerator.app and posts to Discord channels
 * Usage: node run.js [channel]
 * Channels: reply, daily, weekly, monthly, seasonal, yearly, decadic
 */

const { chromium } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Discord posting functions
const {
    postToDiscordWebhook,
    formatGematriaMessage,
    WEBHOOKS
} = require('./discord.js');

/**
 * Scrape gematria phrase and capture GIF
 */
async function scrapeGematria() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('🌐 Opening gematriagenerator.app...');
        await page.goto("https://gematriagenerator.app");
        await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
        console.log("✅ Page loaded");

        // Check the checkbox for definitions
        await page.locator("input[type=\"checkbox\"]").check();

        let phrase = "";
        let values = "";
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log(`🔄 Attempt ${attempts}...`);

            // Close error modal if present
            try {
                const closeBtn = page.locator("button:has-text(\"Close\")").first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    console.log("   Closing error modal...");
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                    continue;
                }
            } catch (e) {}

            // Clear if needed
            try {
                const clearBtn = page.locator("button:has-text(\"Clear\")");
                if (await clearBtn.isVisible({ timeout: 500 })) {
                    await clearBtn.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) {}

            await page.click("button:has-text(\"Generate Random Phrase\")");

            // Wait for completion
            for (let i = 0; i < 60; i++) {
                await page.waitForTimeout(1000);
                const hasError = await page.locator("button:has-text(\"Close\")").isVisible().catch(() => false);
                if (hasError) {
                    console.log("   Error detected, retrying...");
                    break;
                }
                const stillGenerating = await page.locator("button:has-text(\"Generating\")").isVisible().catch(() => false);
                if (!stillGenerating) {
                    console.log("   Generation complete");
                    break;
                }
            }

            await page.waitForTimeout(2000);

            // Find the phrase input
            const allInputs = await page.locator("input").all();
            for (let i = 0; i < allInputs.length; i++) {
                const val = await allInputs[i].inputValue().catch(() => "");
                const type = await allInputs[i].getAttribute("type");
                if (type === "text" && val.length > 10) {
                    phrase = val;
                    console.log(`✅ Found phrase: "${phrase.substring(0, 40)}..."`);
                    break;
                }
            }

            if (phrase) {
                // Get the values (format: 333/666/111/99)
                try {
                    const redText = await page.evaluate(() => {
                        const elements = document.querySelectorAll("*");
                        for (const el of elements) {
                            const text = el.textContent.trim();
                            if (/^\d+\/\d+\/\d+\/\d+$/.test(text)) {
                                return text;
                            }
                        }
                        return null;
                    });
                    if (redText) {
                        values = redText;
                        console.log(`✅ Found values: ${values}`);
                    }
                } catch (e) {
                    console.log("⚠️  Could not get values:", e.message);
                }
            }
        }

        if (!phrase) {
            throw new Error("Failed to generate phrase after 20 attempts");
        }

        // Save phrase and values
        fs.writeFileSync("phrase.txt", phrase);
        fs.writeFileSync("values.txt", values);

        // Clean old frames
        if (fs.existsSync("./frames")) {
            fs.rmSync("./frames", { recursive: true });
        }
        fs.mkdirSync("./frames");

        // Find and capture the SVG pattern
        let gifPath = null;
        const svgs = await page.locator("svg").all();

        for (const svg of svgs) {
            const box = await svg.boundingBox();
            if (box && box.width > 200 && box.height > 100) {
                await svg.scrollIntoViewIfNeeded();
                console.log(`📸 Capturing SVG (${Math.round(box.width)}x${Math.round(box.height)})...`);

                // Capture 30 frames
                for (let i = 0; i < 30; i++) {
                    await svg.screenshot({ path: `./frames/frame${String(i).padStart(3, "0")}.png` });
                    await page.waitForTimeout(100);
                }

                // Convert to GIF
                console.log("🎬 Converting to GIF...");
                execSync("ffmpeg -y -i ./frames/frame%03d.png -vf \"pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg\" output.gif", { stdio: 'pipe' });
                gifPath = path.join(__dirname, "output.gif");
                console.log("✅ Saved output.gif");
                break;
            }
        }

        // Parse values into definitions
        const valueParts = values.split('/');
        const definitions = [
            `English: ${valueParts[0] || '?'}`,
            `Hebrew: ${valueParts[1] || '?'}`,
            `Simple: ${valueParts[2] || '?'}`,
            `Reduced: ${valueParts[3] || '?'}`
        ];

        return {
            phrase,
            value: values,
            definitions,
            gifPath
        };

    } finally {
        await browser.close();
    }
}

/**
 * Post to a specific Discord channel
 */
async function postToChannel(channel, gematriaData) {
    const webhookUrl = WEBHOOKS[channel];

    if (!webhookUrl) {
        console.log(`⚠️  No webhook configured for channel: ${channel}`);
        return { success: false, error: `Missing webhook for ${channel}` };
    }

    const channelNames = {
        reply: 'Reply',
        nonstop: 'Nonstop',
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        seasonal: 'Seasonal',
        yearly: 'Yearly',
        decadic: 'Decadic'
    };

    const channelColors = {
        reply: 0xE91E63,
        nonstop: 0xE91E63,
        daily: 0x9B59B6,
        weekly: 0x3498DB,
        monthly: 0x2ECC71,
        seasonal: 0xFF8C00,
        yearly: 0xE74C3C,
        decadic: 0xFFD700
    };

    const text = formatGematriaMessage(gematriaData);
    const channelName = channelNames[channel] || channel;

    console.log(`→ Discord (${channelName})...`);

    const result = await postToDiscordWebhook(text, webhookUrl, {
        username: `${channelName} Aik Bekar⁹`,
        embed: {
            description: text,
            color: channelColors[channel] || 0x9B59B6,
            footer: `${channelName} Aik Bekar⁹`
        },
        filePath: gematriaData.gifPath
    });

    if (result.success) {
        console.log(`✅ Discord (${channelName}): Posted successfully!`);
    }

    return result;
}

/**
 * Main function
 */
async function main() {
    const channel = process.argv[2] || 'daily';

    console.log('═══════════════════════════════════════════');
    console.log('    🔢 Gematria Bot');
    console.log('═══════════════════════════════════════════\n');
    console.log(`Target channel: ${channel}\n`);

    // Step 1: Scrape
    console.log('📡 Step 1: Scraping gematria...\n');
    const gematriaData = await scrapeGematria();

    console.log('\n--- Result ---');
    console.log(`Phrase: ${gematriaData.phrase}`);
    console.log(`Values: ${gematriaData.value}`);
    console.log(`GIF: ${gematriaData.gifPath ? 'Yes' : 'No'}\n`);

    // Step 2: Post to Discord
    console.log('📤 Step 2: Posting to Discord...\n');
    const result = await postToChannel(channel, gematriaData);

    console.log('\n═══════════════════════════════════════════');
    if (result.success) {
        console.log('    ✅ Success!');
    } else {
        console.log(`    ❌ Failed: ${result.error}`);
    }
    console.log('═══════════════════════════════════════════\n');

    return result;
}

// Run
main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
