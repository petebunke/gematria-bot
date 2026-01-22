/**
 * scraper.js - Scrapes gematriagenerator.app using Playwright and creates animated GIF
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function getGematriaPhrase() {
    console.log('Launching browser to generate phrase...');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://gematriagenerator.app');
        await page.waitForSelector('button:has-text("Loading")', { state: 'hidden', timeout: 60000 });
        console.log('Page loaded');

        await page.locator('input[type="checkbox"]').check();

        let phrase = '';
        let values = '';
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log('Attempt', attempts);

            // Close error modal if present
            try {
                const closeBtn = page.locator('button:has-text("Close")').first();
                if (await closeBtn.isVisible({ timeout: 500 })) {
                    console.log('Closing error modal...');
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
                    console.log('Error detected');
                    break;
                }
                const stillGenerating = await page.locator('button:has-text("Generating")').isVisible().catch(() => false);
                if (!stillGenerating) {
                    console.log('Generation finished');
                    break;
                }
            }

            await page.waitForTimeout(2000);

            // Find the phrase input
            const allInputs = await page.locator('input').all();
            for (let i = 0; i < allInputs.length; i++) {
                const val = await allInputs[i].inputValue().catch(() => '');
                const type = await allInputs[i].getAttribute('type');
                if (type === 'text' && val.length > 10) {
                    phrase = val;
                    console.log('Found phrase:', phrase.substring(0, 50) + '...');
                    break;
                }
            }

            if (phrase) {
                // Get the red text values
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
                    if (redText) {
                        values = redText;
                        console.log('Found values:', values);
                    }
                } catch (e) {
                    console.log('Could not get values:', e.message);
                }
            }
        }

        if (!phrase) {
            throw new Error('Failed to generate phrase after ' + attempts + ' attempts');
        }

        console.log('Generated phrase:', phrase);
        console.log('Values:', values);

        // Clean old frames
        const framesDir = path.join(__dirname, 'frames');
        if (fs.existsSync(framesDir)) {
            fs.rmSync(framesDir, { recursive: true });
        }
        fs.mkdirSync(framesDir);

        // Find the big SVG for screenshot
        let targetSvg = null;
        const svgs = await page.locator('svg').all();

        for (const svg of svgs) {
            const box = await svg.boundingBox();
            if (box && box.width > 200 && box.height > 100) {
                targetSvg = svg;
                await svg.scrollIntoViewIfNeeded();
                console.log('Found SVG:', box.width, 'x', box.height);
                break;
            }
        }

        const gifPath = path.join(__dirname, 'output.gif');

        if (targetSvg) {
            console.log('Capturing 30 frames...');
            for (let i = 0; i < 30; i++) {
                await targetSvg.screenshot({ path: path.join(framesDir, `frame${String(i).padStart(3, '0')}.png`) });
                await page.waitForTimeout(100);
            }

            console.log('Converting to GIF...');
            execSync(`ffmpeg -y -i ${framesDir}/frame%03d.png -vf "pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg" ${gifPath}`);
            console.log('Saved output.gif');
        }

        await browser.close();

        // Parse definitions from values
        const valueArray = values.split('/');
        const definitions = [];
        if (valueArray.length >= 4) {
            definitions.push(`English: ${valueArray[0]}`);
            definitions.push(`Hebrew: ${valueArray[1]}`);
            definitions.push(`Simple: ${valueArray[2]}`);
            definitions.push(`Aik Bekar\u2079: ${valueArray[3]}`);
        }

        return {
            phrase: `${phrase} (${values})`,
            definitions,
            gifPath: fs.existsSync(gifPath) ? gifPath : null
        };

    } catch (error) {
        await browser.close();
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    getGematriaPhrase()
        .then(result => {
            console.log('\nResult:', result);
        })
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}

module.exports = { getGematriaPhrase };
