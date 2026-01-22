
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log("Going to site...");
    await page.goto("https://gematriagenerator.app");
    
    // Wait for the buttons to finish loading (text will change from "Loading Word List...")
    console.log("Waiting for word list to load...");
    await page.waitForFunction(() => {
        const buttons = document.querySelectorAll("button");
        return Array.from(buttons).some(b => !b.textContent.includes("Loading"));
    }, { timeout: 30000 });
    
    console.log("Word list loaded! Clicking generate button...");
    
    // Click the first generate button (red one on left)
    const generateButton = await page.locator("button:has-text(\"Generate\")").first();
    await generateButton.click();
    
    // Wait a moment for phrase to appear
    await page.waitForTimeout(2000);
    
    // Get the phrase from the input field
    const phrase = await page.locator("input[placeholder*=\"word\"], input[type=\"text\"]").first().inputValue();
    
    console.log("Generated phrase:", phrase);
    
    // Take a screenshot to verify
    await page.screenshot({ path: "result.png" });
    
    await browser.close();
    
    return phrase;
})();

