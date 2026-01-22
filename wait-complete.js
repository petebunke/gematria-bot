
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto("https://gematriagenerator.app");
    
    // Wait for load
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    console.log("Page loaded");
    
    // Enable Aik Bekar checkbox
    await page.locator("input[type=\"checkbox\"]").check();
    console.log("Aik Bekar enabled");
    
    // Click Generate Random Phrase
    await page.click("button:has-text(\"Generate Random Phrase\")");
    console.log("Clicked generate, waiting...");
    
    // Wait for button to stop saying "Generating..."
    await page.waitForSelector("button:has-text(\"Generating\")", { state: "hidden", timeout: 120000 });
    console.log("Generation complete");
    
    // Extra wait for SVG to render
    await page.waitForTimeout(2000);
    
    // Get phrase
    const phrase = await page.inputValue("input");
    console.log("Phrase:", phrase);
    
    // Full page screenshot
    await page.screenshot({ path: "complete.png", fullPage: true });
    console.log("Saved complete.png");
    
    // Keep browser open to see
    await page.waitForTimeout(10000);
    
    await browser.close();
})();

