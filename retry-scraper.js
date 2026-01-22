
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
    
    let phrase = "";
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!phrase && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}...`);
        
        // Clear any previous result
        const clearBtn = page.locator("button:has-text(\"Clear Phrases\")");
        if (await clearBtn.isVisible()) {
            await clearBtn.click();
            await page.waitForTimeout(500);
        }
        
        // Click Generate Random Phrase
        await page.click("button:has-text(\"Generate Random Phrase\")");
        
        // Wait for button to stop saying "Generating..."
        try {
            await page.waitForSelector("button:has-text(\"Generating\")", { state: "hidden", timeout: 30000 });
        } catch (e) {
            console.log("Timeout waiting for generation, retrying...");
            continue;
        }
        
        // Wait a moment
        await page.waitForTimeout(1000);
        
        // Check for phrase
        phrase = await page.inputValue("input");
        
        if (!phrase) {
            console.log("No phrase generated, retrying...");
        }
    }
    
    if (phrase) {
        console.log("Success! Phrase:", phrase);
        await page.screenshot({ path: "success.png", fullPage: true });
        console.log("Saved success.png");
    } else {
        console.log("Failed after", maxAttempts, "attempts");
    }
    
    await page.waitForTimeout(5000);
    await browser.close();
})();

