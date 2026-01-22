
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto("https://gematriagenerator.app");
    
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    await page.locator("input[type=\"checkbox\"]").check();
    
    // Click generate
    await page.click("button:has-text(\"Generate Random Phrase\")");
    
    // Wait and screenshot whatever appears
    await page.waitForTimeout(10000);
    await page.screenshot({ path: "error-state.png", fullPage: true });
    console.log("Saved error-state.png");
    
    // Dump the HTML so I can see the modal structure
    const html = await page.content();
    require("fs").writeFileSync("page.html", html);
    console.log("Saved page.html");
    
    await browser.close();
})();

