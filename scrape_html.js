const puppeteer = require('puppeteer');
(async () => {
    const b = await puppeteer.launch({ headless: 'new' });
    const p = await b.newPage();
    p.on('request', req => {
        if (req.url().includes('.json') && !req.url().includes('config')) {
            console.log('BINGO:', req.url());
        }
    });
    // Try to force HTML renderer
    await p.goto('https://snbp.ui.ac.id/?renderer=html', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await p.evaluate(() => {
        const i = document.querySelectorAll('input');
        if (i.length >= 2) {
            i[0].value = '426631796';
            i[0].dispatchEvent(new Event('input', { bubbles: true }));
            i[1].value = '15042008';
            i[1].dispatchEvent(new Event('input', { bubbles: true }));
            const btn = document.querySelector('flt-semantics[role="button"]');
            if(btn) { btn.click(); }
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await b.close();
})();
