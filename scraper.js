/**
 * scraper.js - Interacts with gematriagenerator.app using Puppeteer
 */

const puppeteer = require('puppeteer');

async function getGematriaPhrase() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        console.log('📡 Navigating to gematriagenerator.app...');
        await page.goto('https://gematriagenerator.app', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for JS to load
        await new Promise(r => setTimeout(r, 3000));

        // Take debug screenshot
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved to debug-screenshot.png');

        // Find all interactive elements
        const pageInfo = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                tag: el.tagName,
                type: el.type,
                id: el.id,
                name: el.name,
                placeholder: el.placeholder,
                value: el.value,
                className: el.className
            }));

            const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')).map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim().substring(0, 50),
                id: el.id,
                className: el.className
            }));

            const text = document.body.innerText.substring(0, 500);

            return { inputs, buttons, text };
        });

        console.log('\n📋 Page Analysis:');
        console.log('Inputs:', JSON.stringify(pageInfo.inputs, null, 2));
        console.log('Buttons:', JSON.stringify(pageInfo.buttons, null, 2));
        console.log('Page text preview:', pageInfo.text);

        // ==============================================
        // TODO: Customize these selectors based on the actual site
        // After running this script, check debug-screenshot.png
        // and the console output to find the right selectors
        // ==============================================

        // Example interaction (uncomment and modify):
        // await page.click('button.generate');
        // await new Promise(r => setTimeout(r, 1000));
        // const phrase = await page.$eval('#phrase-input', el => el.value);
        // const value = await page.$eval('#gematria-value', el => el.textContent);

        return {
            phrase: null, // Replace with actual scraped phrase
            value: null,  // Replace with actual scraped value
            debug: pageInfo
        };

    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    getGematriaPhrase()
        .then(result => {
            console.log('\n✅ Result:', result);
        })
        .catch(err => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { getGematriaPhrase };
