
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        recordVideo: { dir: "./videos", size: { width: 800, height: 600 } }
    });
    const page = await context.newPage();
    
    await page.goto("https://gematriagenerator.app");
    
    // Wait for load
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    console.log("Page loaded");
    
    // Enable Aik Bekar checkbox
    await page.locator("input[type=\"checkbox\"]").check();
    
    let phrase = "";
    let attempts = 0;
    
    while (!phrase && attempts < 10) {
        attempts++;
        console.log("Attempt", attempts);
        
        // Clear previous result first
        try {
            const clearBtn = page.locator("button:has-text(\"Clear\")");
            if (await clearBtn.isVisible({ timeout: 1000 })) {
                await clearBtn.click();
                await page.waitForTimeout(500);
            }
        } catch (e) {}
        
        // Find and click generate button
        try {
            const genBtn = page.locator("button").filter({ hasText: /Generate Random/i });
            await genBtn.waitFor({ state: "visible", timeout: 5000 });
            await genBtn.click();
        } catch (e) {
            console.log("Could not find generate button, refreshing...");
            await page.reload();
            await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
            await page.locator("input[type=\"checkbox\"]").check();
            continue;
        }
        
        // Wait for generation to complete
        try {
            await page.waitForFunction(() => {
                const btn = document.querySelector("button");
                return btn && !btn.textContent.includes("Generating");
            }, { timeout: 30000 });
        } catch (e) {
            console.log("Generation timeout, retrying...");
            continue;
        }
        
        await page.waitForTimeout(1000);
        phrase = await page.inputValue("input");
        
        if (!phrase) {
            console.log("No phrase, retrying...");
        }
    }
    
    if (phrase) {
        console.log("Phrase:", phrase);
        
        // Scroll to SVG and record animation
        const svg = page.locator("svg").first();
        await svg.scrollIntoViewIfNeeded();
        console.log("Recording animation for 5 seconds...");
        await page.waitForTimeout(5000);
    }
    
    await context.close();
    await browser.close();
    
    console.log("Done! Check ./videos folder");
})();

