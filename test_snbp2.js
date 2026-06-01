const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('request', req => {
        if (req.url().includes('snpmb') || req.url().includes('data') || req.url().includes('snbp')) {
            console.log('REQ:', req.url());
        }
    });

    await page.goto('https://snbp.ui.ac.id/', { waitUntil: 'networkidle0' });
    
    // Evaluate in page to find inputs and click them
    await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        if (inputs.length >= 2) {
            inputs[0].value = '426630866';
            inputs[1].value = '12122006';
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    
    // Type something to trigger React/Flutter state
    await page.mouse.click(600, 300);
    await page.keyboard.type('426630866');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12122006');
    await page.keyboard.press('Enter');
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();

