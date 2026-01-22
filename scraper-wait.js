
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log("Going to site...");
    await page.goto("https://gematriagenerator.app");
    
    // Wait until NO buttons say "Loading"
    console.log("Waiting for word lists to fully load...");
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    
    console.log("Loaded! Taking screenshot...");
    await page.screenshot({ path: "loaded.png" });
    
    // Now click generate
    console.log("Clicking generate...");
    await page.click("button:has-text(\"Generate\")");
    
    // Wait for phrase to appear
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: "after-click.png" });
    
    // Get phrase
    const inputs = await page.locator("input").all();
    for (const input of inputs) {
        const val = await input.inputValue();
        if (val) console.log("Phrase:", val);
    }
    
    await browser.close();
})();

