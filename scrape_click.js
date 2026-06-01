const puppeteer = require('puppeteer');

(async () => {
    const b = await puppeteer.launch({ headless: 'new' });
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 800 });

    p.on('request', req => {
        if (req.url().includes('.json') && !req.url().includes('config')) {
            console.log('BINGO:', req.url());
        }
    });

    await p.goto('https://snbp.ui.ac.id/', { waitUntil: 'networkidle2' });

    await p.evaluate(() => {
        const i = document.querySelectorAll('input');
        if (i.length >= 2) {
            i[0].value = '426631796'; // Shabila
            i[0].dispatchEvent(new Event('input', { bubbles: true }));
            i[1].value = '15042008';
            i[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    await new Promise(r => setTimeout(r, 1000));

    const btn = await p.$('flt-semantics[role="button"]');
    if (btn) {
        const box = await btn.boundingBox();
        console.log('BOX:', box);
        if (box) {
            await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
    } else {
        console.log("Button not found via semantics");
    }

    await new Promise(r => setTimeout(r, 5000));
    await b.close();
})();
