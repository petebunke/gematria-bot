
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('Going to site...');
    await page.goto('https://gematriagenerator.app');
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'debug.png' });
    
    console.log('Done! Check debug.png');
    await browser.close();
})();

