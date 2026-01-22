
const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto("https://gematriagenerator.app");
    
    // Wait for load
    await page.waitForSelector("button:has-text(\"Loading\")", { state: "hidden", timeout: 60000 });
    
    // Enable Aik Bekar checkbox
    const checkbox = page.locator("input[type=\"checkbox\"]");
    await checkbox.check();
    console.log("Aik Bekar enabled");
    
    // Click Generate Random Phrase
    await page.click("button:has-text(\"Generate Random Phrase\")");
    
    // Wait for result
    await page.waitForTimeout(3000);
    
    // Screenshot to see the SVG
    await page.screenshot({ path: "with-svg.png", fullPage: true });
    console.log("Saved with-svg.png");
    
    // Get phrase
    const phrase = await page.inputValue("input");
    console.log("Phrase:", phrase);
    
    // Try to find SVG
    const svgCount = await page.locator("svg").count();
    console.log("Found SVG elements:", svgCount);
    
    // Get the SVG HTML
    const svgs = await page.locator("svg").all();
    for (let i = 0; i < svgs.length; i++) {
        const html = await svgs[i].evaluate(el => el.outerHTML);
        console.log(`SVG ${i} preview:`, html.substring(0, 200));
    }
    
    await browser.close();
})();

