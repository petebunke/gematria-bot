
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto("https://gematriagenerator.app");
    
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    console.log("Page loaded");
    
    await page.locator("input[type=\"checkbox\"]").check();
    
    let phrase = "";
    let svgCaptured = false;
    let attempts = 0;
    
    while ((!phrase || !svgCaptured) && attempts < 20) {
        attempts++;
        console.log("Attempt", attempts);
        
        // Check for error modal and close it
        try {
            const closeWindow = page.locator("button:has-text(\"Close\"), button:has-text(\"close window\"), button:has-text(\"Close Window\")");
            if (await closeWindow.isVisible({ timeout: 500 })) {
                console.log("Error modal - clicking close");
                await closeWindow.click();
                await page.waitForTimeout(500);
                continue;
            }
        } catch (e) {}
        
        // Also try X button
        try {
            const xBtn = page.locator("button:has-text(\"×\"), button:has-text(\"X\"), [aria-label*=\"close\" i], [aria-label*=\"Close\" i]");
            if (await xBtn.isVisible({ timeout: 500 })) {
                console.log("Error modal - clicking X");
                await xBtn.click();
                await page.waitForTimeout(500);
                continue;
            }
        } catch (e) {}
        
        // Clear previous results
        try {
            const clearBtn = page.locator("button:has-text(\"Clear\")");
            if (await clearBtn.isVisible({ timeout: 500 })) {
                await clearBtn.click();
                await page.waitForTimeout(500);
            }
        } catch (e) {}
        
        // Click generate
        await page.click("button:has-text(\"Generate Random Phrase\")");
        
        // Poll for either success or error for up to 60 seconds
        let done = false;
        for (let i = 0; i < 60 && !done; i++) {
            await page.waitForTimeout(1000);
            
            // Check for error modal
            const hasError = await page.locator("button:has-text(\"Close\"), button:has-text(\"close window\")").isVisible().catch(() => false);
            if (hasError) {
                console.log("Error detected");
                done = true;
                break;
            }
            
            // Check if generating finished
            const stillGenerating = await page.locator("button:has-text(\"Generating\")").isVisible().catch(() => false);
            if (!stillGenerating) {
                done = true;
            }
        }
        
        // Get phrase
        phrase = await page.inputValue("input").catch(() => "");
        if (!phrase) continue;
        
        console.log("Phrase:", phrase);
        
        // Get SVG
        const svgs = await page.locator("svg").all();
        for (const svg of svgs) {
            const box = await svg.boundingBox();
            if (box && box.width > 200) {
                await svg.screenshot({ path: "pattern.png" });
                console.log("Saved pattern.png");
                svgCaptured = true;
                break;
            }
        }
    }
    
    console.log(phrase && svgCaptured ? "Success!" : "Failed");
    await browser.close();
})();

