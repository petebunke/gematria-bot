/**
 * Gematria Generator Module
 *
 * Generates gematria phrases from gematriagenerator.app
 * and captures animated SVG as GIF
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.join(__dirname, 'frames');
const OUTPUT_GIF = path.join(__dirname, 'output.gif');

async function generateGematria() {
    let browser = null;

    try {
        console.log('Launching browser...');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        console.log('Navigating to gematriagenerator.app...');
        await page.goto('https://gematriagenerator.app', { timeout: 60000 });
        await page.waitForSelector('button:has-text("Loading")', { state: 'hidden', timeout: 60000 });
        console.log('Page loaded');

        // Enable Aik Bekar checkbox
        await page.locator('input[type="checkbox"]').check();
        console.log('Aik Bekar enabled');

        let phrase = '';
        let values = '';
        let attempts = 0;

        while (!phrase && attempts < 20) {
            attempts++;
            console.log(`Attempt ${attempts}...`);

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

            // Generate random phrase
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
            for (const input of allInputs) {
                const val = await input.inputValue().catch(() => '');
                const type = await input.getAttribute('type');
                if (type === 'text' && val.length > 10) {
                    phrase = val;
                    console.log(`Found phrase: ${phrase.substring(0, 50)}...`);
                    break;
                }
            }

            if (phrase) {
                // Get the values
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
                        console.log(`Found values: ${values}`);
                    }
                } catch (e) {
                    console.log('Could not get values:', e.message);
                }
            }
        }

        if (!phrase) {
            return { success: false, error: 'Failed to generate phrase after 20 attempts' };
        }

        // Save phrase and values
        fs.writeFileSync(path.join(__dirname, 'phrase.txt'), phrase);
        fs.writeFileSync(path.join(__dirname, 'values.txt'), values);

        // Capture GIF frames
        if (fs.existsSync(FRAMES_DIR)) {
            fs.rmSync(FRAMES_DIR, { recursive: true });
        }
        fs.mkdirSync(FRAMES_DIR);

        // Find the big SVG
        let targetSvg = null;
        const svgs = await page.locator('svg').all();

        for (const svg of svgs) {
            const box = await svg.boundingBox();
            if (box && box.width > 200 && box.height > 100) {
                targetSvg = svg;
                await svg.scrollIntoViewIfNeeded();
                console.log(`Found SVG: ${box.width}x${box.height}`);
                break;
            }
        }

        if (targetSvg) {
            console.log('Capturing 30 frames...');
            for (let i = 0; i < 30; i++) {
                await targetSvg.screenshot({
                    path: path.join(FRAMES_DIR, `frame${String(i).padStart(3, '0')}.png`)
                });
                await page.waitForTimeout(100);
            }

            console.log('Converting to GIF...');
            try {
                execSync(
                    `ffmpeg -y -i ${FRAMES_DIR}/frame%03d.png -vf "pad=iw+6:ih:3:0:black,split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=0:stats_mode=single[p];[s1][p]paletteuse=dither=floyd_steinberg" ${OUTPUT_GIF}`,
                    { stdio: 'pipe' }
                );
                console.log('GIF saved');
            } catch (ffmpegError) {
                console.error('FFmpeg error:', ffmpegError.message);
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
        console.error('Generator error:', error);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = { generateGematria };

// Test if run directly
if (require.main === module) {
    generateGematria().then(result => {
        console.log('Result:', result);
    });
}
