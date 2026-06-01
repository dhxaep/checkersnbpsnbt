const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    page.on('request', req => {
        if (req.url().includes('snpmb') || req.url().includes('data') || req.url().includes('snbp') || req.url().includes('storage')) {
            console.log('REQ:', req.url());
        }
    });

    await page.goto('https://snbp.ui.ac.id/', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        if (inputs.length >= 2) {
            inputs[0].value = '426630866';
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[1].value = '12122006';
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            
            const buttons = document.querySelectorAll('flt-semantics[role="button"]');
            if (buttons.length > 0) {
                buttons[buttons.length - 1].click();
            }
        }
    });
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();
