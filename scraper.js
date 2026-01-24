/**
 * scraper.js - Scrapes gematriagenerator.app using Playwright
 *
 * This is based on the working make-gif.js script
 */

const { chromium } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Scrape gematria phrase and optionally create GIF
 * Uses exact logic from make-gif.js
 */
async function getGematriaPhrase(options = {}) {
    const headless = options.headless !== false;
    const createGif = options.createGif !== false;

    console.log("🚀 Starting scraper (headless:", headless, ")");

    const browser = await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        await page.goto("https://gematriagenerator.app");
        await page.waitForSelector('button:has-text("Loading")', { state: "hidden", timeout: 60000 });
        console.log("   Page loaded");

        await page.locator('input[type="checkbox"]').check();

        let phrase = "";
        let values = "";
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log("   Attempt", attempts);

            // Close error modal if present
            try {
                const closeBtn = page.locator('button:has-text("Close")').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    console.log("   Closing error modal...");
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                    continue;
                }
            } catch (e) {}

            // Clear if needed
            try {
                const clearBtn = page.locator('button:has-text("Clear")');
                if (await clearBtn.isVisible({ timeout: 500 })) {
                    await clearBtn.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) {}

            await page.click('button:has-text("Generate Random Phrase")');

            // Wait for completion
            for (let i = 0; i < 60; i++) {
                await page.waitForTimeout(1000);
                const hasError = await page.locator('button:has-text("Close")').isVisible().catch(() => false);
                if (hasError) {
                    console.log("   Error detected");
                    break;
                }
                const stillGenerating = await page.locator('button:has-text("Generating")').isVisible().catch(() => false);
                if (!stillGenerating) {
                    console.log("   Generation finished");
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
                    console.log("   Found phrase:", phrase.substring(0, 50) + "...");
                    break;
                }
            }

            if (phrase) {
                // Get the red text values
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
                        console.log("   Found values:", values);
                    }
                } catch (e) {
                    console.log("   Could not get values:", e.message);
                }
            }
        }

        console.log("\n   Exited loop. Phrase:", phrase ? "YES" : "NO");

        if (!phrase) {
            throw new Error("Could not generate phrase after 20 attempts");
        }

        console.log("✅ Phrase:", phrase);
        console.log("   Values:", values);

        fs.writeFileSync("phrase.txt", phrase);
        fs.writeFileSync("values.txt", values);

        // Scrape word definitions from the page
        console.log("   Scraping word definitions...");
        const words = await page.evaluate(() => {
            const results = [];
            // Look for definition sections - they typically have word, part of speech, and definition
            // The website shows definitions in sections/cards for each word
            const sections = document.querySelectorAll('div, section, article');

            for (const section of sections) {
                const text = section.innerText || '';
                // Look for patterns like "Word\nnoun\nDefinition text"
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                // Check if this looks like a definition block (has a single capitalized word followed by part of speech)
                if (lines.length >= 3) {
                    const possibleWord = lines[0];
                    const possiblePos = lines[1]?.toLowerCase();

                    // Check if first line is a single word and second line is a part of speech
                    if (/^[A-Z][a-z]+$/.test(possibleWord) &&
                        ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun', 'article'].includes(possiblePos)) {

                        // Get the definition (rest of the text)
                        const definition = lines.slice(2).join(' ').substring(0, 500);

                        if (definition.length > 10 && !results.find(r => r.word === possibleWord)) {
                            results.push({
                                word: possibleWord,
                                partOfSpeech: possiblePos,
                                definition: definition
                            });
                        }
                    }
                }
            }

            return results;
        });

        console.log(`   Found ${words.length} word definitions`);

        // If we couldn't scrape definitions, fall back to basic word list
        if (words.length === 0) {
            console.log("   Using fallback word extraction...");
            const wordList = phrase.split(" ").filter(w => w.length > 0);
            for (const word of wordList) {
                words.push({
                    word: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                    partOfSpeech: "noun",
                    definition: "A word from the gematria phrase."
                });
            }
        }

        let gifPath = null;

        // Create GIF if requested
        if (createGif) {
            // Clean old frames
            const framesDir = "./frames";
            if (fs.existsSync(framesDir)) {
                fs.rmSync(framesDir, { recursive: true });
            }
            fs.mkdirSync(framesDir);

            // Find the big SVG
            let targetSvg = null;
            const svgs = await page.locator("svg").all();

            for (const svg of svgs) {
                const box = await svg.boundingBox();
                if (box && box.width > 200 && box.height > 100) {
                    targetSvg = svg;
                    await svg.scrollIntoViewIfNeeded();
                    console.log("   Found SVG:", box.width, "x", box.height);
                    break;
                }
            }

            if (targetSvg) {
                console.log("🎬 Capturing 30 frames...");
                for (let i = 0; i < 30; i++) {
                    await targetSvg.screenshot({ path: `./frames/frame${String(i).padStart(3, "0")}.png` });
                    await page.waitForTimeout(100);
                }

                console.log("   Converting to GIF...");
                try {
                    execSync('ffmpeg -y -i ./frames/frame%03d.png -vf "pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg" output.gif', {
                        stdio: 'pipe'
                    });
                    gifPath = path.resolve("output.gif");
                    console.log("   ✅ Saved output.gif");
                } catch (e) {
                    console.log("   ⚠️ ffmpeg failed:", e.message);
                }
            }
        }

        return {
            phrase,
            values,
            words,
            gifPath
        };

    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    getGematriaPhrase({ headless: false, createGif: true })
        .then(result => {
            console.log("\n--- FINAL RESULT ---");
            console.log("Phrase:", result.phrase);
            console.log("Values:", result.values);
            console.log("GIF:", result.gifPath);
        })
        .catch(err => {
            console.error("❌ Error:", err);
            process.exit(1);
        });
}

module.exports = { getGematriaPhrase };
