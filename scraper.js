/**
 * scraper.js - Scrapes gematriagenerator.app using Playwright
 * Returns phrase, values, word definitions, and creates GIF
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple dictionary for word definitions (expand as needed)
const DEFINITIONS = {
    // Common words - add more as needed
    'yoga': { partOfSpeech: 'noun', definition: 'Any of several Hindu or Buddhist disciplines aimed at training the consciousness for a state of perfect spiritual insight and tranquillity; especially a system of exercises practiced to promote control of the body and mind.' },
    'highland': { partOfSpeech: 'noun', definition: 'An area of land that is at elevation; mountainous land.' },
    'test': { partOfSpeech: 'noun', definition: 'A procedure for critical evaluation; a means of determining the presence, quality, or truth of something.' },
    'phrase': { partOfSpeech: 'noun', definition: 'A group of words forming a conceptual unit.' },
};

/**
 * Get definition for a word (falls back to generic if not found)
 */
function getDefinition(word) {
    const lower = word.toLowerCase();
    if (DEFINITIONS[lower]) {
        return DEFINITIONS[lower];
    }
    return {
        partOfSpeech: 'noun',
        definition: `A word or concept in the gematria phrase.`
    };
}

/**
 * Scrape gematria phrase and create GIF
 */
async function getGematriaPhrase(options = {}) {
    const createGif = options.createGif !== false;
    const headless = options.headless !== false;

    const browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        console.log('📡 Navigating to gematriagenerator.app...');
        await page.goto('https://gematriagenerator.app');
        await page.waitForSelector('button:has-text("Loading")', { state: 'hidden', timeout: 60000 });
        console.log('   Page loaded');

        // Check the checkbox for definitions
        await page.locator('input[type="checkbox"]').check();

        let phrase = '';
        let values = '';
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log(`   Attempt ${attempts}...`);

            // Close error modal if present
            try {
                const closeBtn = page.locator('button:has-text("Close")').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
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
                if (hasError) break;
                const stillGenerating = await page.locator('button:has-text("Generating")').isVisible().catch(() => false);
                if (!stillGenerating) break;
            }

            await page.waitForTimeout(2000);

            // Find the phrase input
            const allInputs = await page.locator('input').all();
            for (const input of allInputs) {
                const val = await input.inputValue().catch(() => '');
                const type = await input.getAttribute('type');
                if (type === 'text' && val.length > 10) {
                    phrase = val;
                    break;
                }
            }

            if (phrase) {
                // Get the values (like "555/666/111/99")
                try {
                    const redText = await page.evaluate(() => {
                        const elements = document.querySelectorAll('*');
                        for (const el of elements) {
                            const text = el.textContent.trim();
                            if (/^\d+\/\d+\/\d+\/\d+$/.test(text)) {
                                return text;
                            }
                        }
                        return null;
                    });
                    if (redText) values = redText;
                } catch (e) {}
            }
        }

        if (!phrase) {
            throw new Error('Could not generate phrase after 20 attempts');
        }

        console.log('✅ Got phrase:', phrase);
        console.log('   Values:', values);

        // Save to files
        fs.writeFileSync('phrase.txt', phrase);
        fs.writeFileSync('values.txt', values);

        // Parse words and get definitions
        const wordList = phrase.split(' ').filter(w => w.length > 0);
        const words = wordList.map(word => {
            const def = getDefinition(word);
            return {
                word: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                partOfSpeech: def.partOfSpeech,
                definition: def.definition
            };
        });

        let gifPath = null;

        // Create GIF if requested
        if (createGif) {
            console.log('🎬 Creating GIF...');

            // Clean old frames
            const framesDir = path.join(process.cwd(), 'frames');
            if (fs.existsSync(framesDir)) {
                fs.rmSync(framesDir, { recursive: true });
            }
            fs.mkdirSync(framesDir);

            // Find the big SVG
            let targetSvg = null;
            const svgs = await page.locator('svg').all();

            for (const svg of svgs) {
                const box = await svg.boundingBox();
                if (box && box.width > 200 && box.height > 100) {
                    targetSvg = svg;
                    await svg.scrollIntoViewIfNeeded();
                    break;
                }
            }

            if (targetSvg) {
                // Capture frames
                for (let i = 0; i < 30; i++) {
                    await targetSvg.screenshot({ path: path.join(framesDir, `frame${String(i).padStart(3, '0')}.png`) });
                    await page.waitForTimeout(100);
                }

                // Convert to GIF
                try {
                    execSync('ffmpeg -y -i ./frames/frame%03d.png -vf "pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg" output.gif', {
                        stdio: 'pipe'
                    });
                    gifPath = path.join(process.cwd(), 'output.gif');
                    console.log('   ✅ GIF saved to output.gif');
                } catch (e) {
                    console.log('   ⚠️ ffmpeg not available, skipping GIF creation');
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
    getGematriaPhrase({ headless: false })
        .then(result => {
            console.log('\n✅ Result:');
            console.log('Phrase:', result.phrase);
            console.log('Values:', result.values);
            console.log('Words:', result.words);
            console.log('GIF:', result.gifPath);
        })
        .catch(err => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { getGematriaPhrase, getDefinition };
