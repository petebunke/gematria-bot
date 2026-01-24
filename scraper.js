/**
 * scraper.js - Scrapes gematriagenerator.app using Puppeteer
 */

console.log("Loading puppeteer module...");
const puppeteer = require("puppeteer");
console.log("Puppeteer loaded");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Scrape gematria phrase and optionally create GIF
 */
async function getGematriaPhrase(options = {}) {
    const headless = options.headless !== false;
    const createGif = options.createGif !== false;

    console.log("🚀 Starting scraper (headless:", headless, ")");

    let browser = null;
    try {
        console.log("   Launching Puppeteer with executablePath:", process.env.PUPPETEER_EXECUTABLE_PATH || "default");
        browser = await puppeteer.launch({
            headless: headless ? 'new' : false,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions'
            ]
        });
        console.log("   Browser launched");

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 720 });
        console.log("   Page created");

        await page.goto("https://gematriagenerator.app", { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("   Page loaded");

        // Wait for loading to finish
        await page.waitForFunction(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return !btns.some(b => b.textContent.includes('Loading'));
        }, { timeout: 60000 });

        // Check the checkbox
        const checkbox = await page.$('input[type="checkbox"]');
        if (checkbox) await checkbox.click();

        let phrase = "";
        let values = "";
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log("   Attempt", attempts);

            // Close error modal if present
            try {
                const closeBtn = await page.$('button');
                const buttons = await page.$$('button');
                for (const btn of buttons) {
                    const text = await page.evaluate(el => el.textContent, btn);
                    if (text.includes('Close')) {
                        await btn.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                }
            } catch (e) {}

            // Click generate button
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text.includes('Generate Random Phrase')) {
                    await btn.click();
                    break;
                }
            }

            // Wait for completion
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 1000));
                const stillGenerating = await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    return btns.some(b => b.textContent.includes('Generating'));
                });
                if (!stillGenerating) {
                    console.log("   Generation finished");
                    break;
                }
            }

            await new Promise(r => setTimeout(r, 2000));

            // Find the phrase input
            const inputs = await page.$$('input[type="text"]');
            for (const input of inputs) {
                const val = await page.evaluate(el => el.value, input);
                if (val && val.length > 10) {
                    phrase = val;
                    console.log("   Found phrase:", phrase.substring(0, 50) + "...");
                    break;
                }
            }

            if (phrase) {
                // Get the values
                values = await page.evaluate(() => {
                    const elements = document.querySelectorAll("*");
                    for (const el of elements) {
                        const text = el.textContent.trim();
                        if (/^\d+\/\d+\/\d+\/\d+$/.test(text)) {
                            return text;
                        }
                    }
                    return "";
                });
                if (values) console.log("   Found values:", values);
            }
        }

        console.log("\n   Exited loop. Phrase:", phrase ? "YES" : "NO");

        if (!phrase) {
            throw new Error("Could not generate phrase after 20 attempts");
        }

        console.log("✅ Phrase:", phrase);
        console.log("   Values:", values);

        // Scrape word definitions
        console.log("   Scraping word definitions...");
        const words = await page.evaluate(() => {
            const results = [];
            const sections = document.querySelectorAll('div, section, article');

            for (const section of sections) {
                const text = section.innerText || '';
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                if (lines.length >= 3) {
                    const possibleWord = lines[0];
                    const possiblePos = lines[1]?.toLowerCase();

                    if (/^[A-Z][a-z]+$/.test(possibleWord) &&
                        ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun', 'article'].includes(possiblePos)) {
                        const definition = lines.slice(2).join(' ').substring(0, 500);
                        if (definition.length > 10 && !results.find(r => r.word === possibleWord)) {
                            results.push({ word: possibleWord, partOfSpeech: possiblePos, definition });
                        }
                    }
                }
            }
            return results;
        });

        console.log(`   Found ${words.length} word definitions`);

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
            const framesDir = "./frames";
            if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
            fs.mkdirSync(framesDir);

            // Find SVG and capture frames
            const svgBox = await page.evaluate(() => {
                const svgs = document.querySelectorAll('svg');
                for (const svg of svgs) {
                    const rect = svg.getBoundingClientRect();
                    if (rect.width > 200 && rect.height > 100) {
                        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                    }
                }
                return null;
            });

            if (svgBox) {
                console.log("🎬 Capturing 30 frames...");
                for (let i = 0; i < 30; i++) {
                    await page.screenshot({
                        path: `./frames/frame${String(i).padStart(3, "0")}.png`,
                        clip: svgBox
                    });
                    await new Promise(r => setTimeout(r, 100));
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

        return { phrase, values, words, gifPath };

    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.log("   Warning: browser.close() failed:", e.message);
            }
        }
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
