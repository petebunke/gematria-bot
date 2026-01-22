
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log("Going to site...");
    await page.goto("https://gematriagenerator.app");
    
    // Wait longer for word lists to load
    console.log("Waiting 10 seconds for word list to load...");
    await page.waitForTimeout(10000);
    
    // Screenshot to see what buttons exist now
    await page.screenshot({ path: "step1-loaded.png" });
    console.log("Saved step1-loaded.png");
    
    // Find all buttons and log their text
    const buttons = await page.locator("button").all();
    console.log("Found buttons:");
    for (const btn of buttons) {
        const text = await btn.textContent();
        console.log("  -", text.trim());
    }
    
    // Click the first red button (should be generate)
    const redButton = await page.locator("button.bg-red-500, button.bg-red-600, button:has-text(\"Generate\")").first();
    console.log("Clicking button...");
    await redButton.click();
    
    // Wait for result
    await page.waitForTimeout(3000);
    
    // Screenshot after click
    await page.screenshot({ path: "step2-clicked.png" });
    console.log("Saved step2-clicked.png");
    
    // Try to get any input value
    const inputs = await page.locator("input").all();
    console.log("Found inputs:");
    for (const input of inputs) {
        const val = await input.inputValue();
        console.log("  -", val || "(empty)");
    }
    
    await browser.close();
})();

