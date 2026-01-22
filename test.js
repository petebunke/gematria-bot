const puppeteer = require('puppeteer');

async function test() {
    console.log('Launching browser...');
    
    const browser = await puppeteer.launch({
        headless: false,  // Show the browser so we can see what happens
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    
    // Pretend to be a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Going to site...');
    
    try {
        await page.goto('https://gematriagenerator.app', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        console.log('Page loaded! Taking screenshot...');
        await page.screenshot({ path: 'debug.png' });
        console.log('Screenshot saved to debug.png');
        
    } catch (err) {
        console.log('Error:', err.message);
    }

    // Keep browser open for 10 seconds so you can see it
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
}

test();

