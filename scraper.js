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
    const timeout = options.timeout || 90000; // 90 second overall timeout

    console.log("🚀 Starting scraper (headless:", headless, ")");

    const browser = await chromium.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        // Set default timeout for all operations
        context.setDefaultTimeout(30000);

        const page = await context.newPage();

        console.log("   Navigating to gematriagenerator.app...");
        await page.goto("https://gematriagenerator.app", {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for page to be interactive
        await page.waitForTimeout(2000);

        // Check if Loading button exists, wait for it to hide
        try {
            const loadingBtn = page.locator('button:has-text("Loading")');
            if (await loadingBtn.isVisible({ timeout: 2000 })) {
                console.log("   Waiting for Loading to finish...");
                await loadingBtn.waitFor({ state: "hidden", timeout: 30000 });
            }
        } catch (e) {
            console.log("   No Loading button found, continuing...");
        }

        console.log("   Page loaded");

        // Check Aik Bekar checkbox
        try {
            await page.locator('input[type="checkbox"]').check({ timeout: 5000 });
            console.log("   Aik Bekar checkbox checked");
        } catch (e) {
            console.log("   Could not check Aik Bekar checkbox:", e.message);
        }

        let phrase = "";
        let values = "";
        let hebrewValue = "";
        let englishValue = "";
        let simpleValue = "";
        let aikBekarValue = "";
        let attempts = 0;
        const maxAttempts = 5; // Reduced from 20

        while (!phrase && attempts < maxAttempts) {
            attempts++;
            console.log("   Attempt", attempts, "of", maxAttempts);

            // Close error modal if present
            try {
                const closeBtn = page.locator('button:has-text("Close")').first();
                if (await closeBtn.isVisible({ timeout: 1000 })) {
                    console.log("   Closing error modal...");
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                    continue;
                }
            } catch (e) {}

            // Clear if needed
            try {
                const clearBtn = page.locator('button:has-text("Clear")');
                if (await clearBtn.isVisible({ timeout: 1000 })) {
                    await clearBtn.click();
                    await page.waitForTimeout(500);
                }
            } catch (e) {}

            // Click generate button
            console.log("   Clicking Generate Random Phrase...");
            try {
                await page.click('button:has-text("Generate Random Phrase")', { timeout: 5000 });
            } catch (e) {
                console.log("   Could not click generate button:", e.message);
                continue;
            }

            // Wait for completion (max 30 seconds per attempt)
            console.log("   Waiting for generation...");
            for (let i = 0; i < 30; i++) {
                await page.waitForTimeout(1000);
                const hasError = await page.locator('button:has-text("Close")').isVisible().catch(() => false);
                if (hasError) {
                    console.log("   Error modal detected, will retry");
                    break;
                }
                const stillGenerating = await page.locator('button:has-text("Generating")').isVisible().catch(() => false);
                if (!stillGenerating) {
                    console.log("   Generation finished");
                    break;
                }
                if (i % 10 === 9) {
                    console.log("   Still generating... (" + (i+1) + "s)");
                }
            }

            await page.waitForTimeout(1000);

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
                // Get the red text values (combined format like "4444/6666/1111/1111")
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

                // Get individual gematria values from dropdowns
                try {
                    const dropdownValues = await page.evaluate(() => {
                        const selects = document.querySelectorAll('select');
                        const vals = {};
                        selects.forEach((select, idx) => {
                            const val = select.value;
                            if (idx === 0) vals.hebrew = val;
                            else if (idx === 1) vals.english = val;
                            else if (idx === 2) vals.simple = val;
                            else if (idx === 3) vals.aikBekar = val;
                        });
                        return vals;
                    });
                    if (dropdownValues.hebrew) {
                        hebrewValue = dropdownValues.hebrew;
                        englishValue = dropdownValues.english;
                        simpleValue = dropdownValues.simple;
                        aikBekarValue = dropdownValues.aikBekar;
                        console.log("   Individual values - Hebrew:", hebrewValue, "English:", englishValue, "Simple:", simpleValue, "Aik Bekar:", aikBekarValue);
                    }
                } catch (e) {
                    console.log("   Could not get individual values:", e.message);
                }
            }
        }

        console.log("\n   Exited loop. Phrase:", phrase ? "YES" : "NO");

        if (!phrase) {
            throw new Error(`Could not generate phrase after ${maxAttempts} attempts`);
        }

        console.log("✅ Phrase:", phrase);
        console.log("   Values:", values);
        console.log("   Hebrew:", hebrewValue, "English:", englishValue, "Simple:", simpleValue, "Aik Bekar:", aikBekarValue);

        fs.writeFileSync("phrase.txt", phrase);
        fs.writeFileSync("values.txt", values);

        // Parse words for definitions (capitalize first letter)
        const wordList = phrase.split(" ").filter(w => w.length > 0);
        const words = wordList.map(word => ({
            word: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            partOfSpeech: "noun",
            definition: "A word in the gematria phrase."
        }));

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
            hebrewValue,
            englishValue,
            simpleValue,
            aikBekarValue,
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
